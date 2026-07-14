import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOrganizationTree, resolveOrganizationSelection } from "@/lib/organization-unit";
import { saveBasicInfo } from "./actions";
import { RegisterForm } from "./RegisterForm";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function toMonthInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 7) : "";
}

export default async function BasicInfoRegisterPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  // 人事・営業は経歴書を作成しないためEDT001の対象外(docs/screens.md AUTH001参照)
  if (role === "HR_SALES") redirect("/");

  const [employee, userAccount, organizationUnits] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { employeeId } }),
    prisma.userAccount.findUniqueOrThrow({ where: { employeeId } }),
    prisma.organizationUnit.findMany({
      where: { deletedAt: null },
      orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
    }),
  ]);

  const organizationTree = buildOrganizationTree(organizationUnits);
  const initialSelection = resolveOrganizationSelection(
    organizationUnits,
    employee.organizationUnitId,
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">基本情報登録</h1>

      <RegisterForm
        action={saveBasicInfo}
        employeeId={employee.employeeId}
        email={userAccount.email}
        organizationTree={organizationTree}
        initialSelection={initialSelection}
        initialValues={{
          name: employee.name ?? session.user.name ?? "",
          nameKana: employee.nameKana ?? "",
          birthDate: toDateInputValue(employee.birthDate),
          gender: employee.gender ?? "",
          nearestStationLine: employee.nearestStationLine ?? "",
          nearestStationName: employee.nearestStationName ?? "",
          finalSchoolType: employee.finalSchoolType ?? "",
          finalSchoolName: employee.finalSchoolName ?? "",
          finalDepartmentName: employee.finalDepartmentName ?? "",
          graduationStatus: employee.graduationStatus ?? "",
          graduationYearMonth: toMonthInputValue(employee.graduationYearMonth),
        }}
      />
    </main>
  );
}
