"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newAccountSchema, type NewAccountErrors } from "./schema";

export type NewAccountActionState = {
  errors: NewAccountErrors;
};

function targetFields(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("meta" in error)) return [];
  const meta = (error as { meta?: unknown }).meta;
  if (typeof meta !== "object" || meta === null || !("target" in meta)) return [];
  const target = (meta as { target?: unknown }).target;
  return Array.isArray(target) ? target.map(String) : [];
}

export async function createAccount(
  _prevState: NewAccountActionState,
  formData: FormData,
): Promise<NewAccountActionState> {
  const session = await auth();
  const managerId = session?.user.employeeId;
  const role = session?.user.role;
  if (!managerId || role !== "MANAGER") redirect("/login");

  const raw = Object.fromEntries(formData.entries());
  const parsed = newAccountSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: NewAccountErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NewAccountErrors;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction([
      prisma.employee.create({
        data: {
          employeeId: data.employeeId,
          organizationUnitId: data.organizationUnitId ?? null,
          createdBy: managerId,
          createdProgram: "EDT006",
          updatedBy: managerId,
          updatedProgram: "EDT006",
        },
      }),
      prisma.userAccount.create({
        data: {
          employeeId: data.employeeId,
          email: data.email,
          role: data.role,
          createdBy: managerId,
          createdProgram: "EDT006",
          updatedBy: managerId,
          updatedProgram: "EDT006",
        },
      }),
    ]);
  } catch (error) {
    const fields = targetFields(error);
    if (fields.some((f) => f.includes("employee_id") || f === "employee_pkey")) {
      return { errors: { employeeId: "この社員IDは既に使用されています" } };
    }
    if (fields.some((f) => f.includes("email"))) {
      return { errors: { email: "このメールアドレスは既に使用されています" } };
    }
    throw error;
  }

  redirect("/accounts");
}
