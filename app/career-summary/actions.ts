"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { careerSummarySchema, type CareerSummaryErrors } from "./schema";

export type CareerSummaryActionState = {
  errors: CareerSummaryErrors;
};

export async function saveCareerSummary(
  _prevState: CareerSummaryActionState,
  formData: FormData,
): Promise<CareerSummaryActionState> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || (role !== "GENERAL_STAFF" && role !== "MANAGER")) {
    redirect("/login");
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = careerSummarySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: CareerSummaryErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CareerSummaryErrors;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const data = parsed.data;

  await prisma.employee.update({
    where: { employeeId },
    data: {
      careerSummary: data.careerSummary ?? null,
      selfPr: data.selfPr ?? null,
      updatedBy: employeeId,
      updatedProgram: "EDT002",
    },
  });

  redirect("/mypage");
}
