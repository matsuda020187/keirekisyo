"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editAccountSchema, type EditAccountErrors } from "./schema";

export type EditAccountActionState = {
  errors: EditAccountErrors;
};

async function requireManager(): Promise<string> {
  const session = await auth();
  const managerId = session?.user.employeeId;
  const role = session?.user.role;
  if (!managerId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return managerId;
}

export async function updateAccount(
  id: number,
  _prevState: EditAccountActionState,
  formData: FormData,
): Promise<EditAccountActionState> {
  const managerId = await requireManager();

  const raw = Object.fromEntries(formData.entries());
  const parsed = editAccountSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: EditAccountErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof EditAccountErrors;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const data = parsed.data;
  const account = await prisma.userAccount.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.employee.update({
      where: { employeeId: account.employeeId },
      data: {
        organizationUnitId: data.organizationUnitId ?? null,
        updatedBy: managerId,
        updatedProgram: "EDT007",
      },
    }),
    prisma.userAccount.update({
      where: { id },
      data: { role: data.role, updatedBy: managerId, updatedProgram: "EDT007" },
    }),
  ]);

  redirect("/accounts");
}

export async function retireAccount(id: number): Promise<{ error?: string }> {
  const managerId = await requireManager();
  const account = await prisma.userAccount.findUniqueOrThrow({ where: { id } });

  await prisma.employee.update({
    where: { employeeId: account.employeeId },
    data: {
      employmentStatus: "RETIRED",
      updatedBy: managerId,
      updatedProgram: "EDT007",
    },
  });

  revalidatePath(`/accounts/${id}/edit`);
  return {};
}

export async function reinstateAccount(id: number): Promise<{ error?: string }> {
  const managerId = await requireManager();
  const account = await prisma.userAccount.findUniqueOrThrow({ where: { id } });

  await prisma.employee.update({
    where: { employeeId: account.employeeId },
    data: {
      employmentStatus: "ACTIVE",
      updatedBy: managerId,
      updatedProgram: "EDT007",
    },
  });

  revalidatePath(`/accounts/${id}/edit`);
  return {};
}
