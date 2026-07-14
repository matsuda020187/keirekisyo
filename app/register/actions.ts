"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basicInfoSchema, type BasicInfoErrors } from "./schema";

export type BasicInfoActionState = {
  errors: BasicInfoErrors;
};

export async function saveBasicInfo(
  _prevState: BasicInfoActionState,
  formData: FormData,
): Promise<BasicInfoActionState> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || (role !== "GENERAL_STAFF" && role !== "MANAGER")) {
    redirect("/login");
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = basicInfoSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: BasicInfoErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BasicInfoErrors;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const data = parsed.data;

  await prisma.employee.update({
    where: { employeeId },
    data: {
      name: data.name,
      nameKana: data.nameKana,
      birthDate: new Date(data.birthDate),
      gender: data.gender ?? null,
      organizationUnitId: data.organizationUnitId ?? null,
      nearestStationLine: data.nearestStationLine ?? null,
      nearestStationName: data.nearestStationName ?? null,
      finalSchoolType: data.finalSchoolType ?? null,
      finalSchoolName: data.finalSchoolName ?? null,
      finalDepartmentName: data.finalDepartmentName ?? null,
      graduationStatus: data.graduationStatus ?? null,
      graduationYearMonth: data.graduationYearMonth ? new Date(`${data.graduationYearMonth}-01`) : null,
      isRegistered: true,
      updatedBy: employeeId,
      updatedProgram: "EDT001",
    },
  });

  redirect("/mypage");
}
