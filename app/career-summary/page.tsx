import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCareerSummary } from "./actions";
import { CareerSummaryForm } from "./CareerSummaryForm";

export default async function CareerSummaryPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const employee = await prisma.employee.findUniqueOrThrow({ where: { employeeId } });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">経歴概要・自己PR登録</h1>

      <CareerSummaryForm
        action={saveCareerSummary}
        initialValues={{
          careerSummary: employee.careerSummary ?? "",
          selfPr: employee.selfPr ?? "",
        }}
      />
    </main>
  );
}
