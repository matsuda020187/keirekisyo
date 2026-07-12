import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCertifications } from "./actions";
import { CertificationsForm } from "./CertificationsForm";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function CertificationsPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const [categories, certifications, employeeCertifications] = await Promise.all([
    prisma.certificationCategory.findMany({
      where: { deletedAt: null },
      orderBy: { certificationCategoryName: "asc" },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      orderBy: { certificationName: "asc" },
    }),
    prisma.employeeCertification.findMany({
      where: { employeeId, deletedAt: null },
      include: { certification: true },
      orderBy: { acquiredDate: "asc" },
    }),
  ]);

  const initialRows = employeeCertifications.map((ec, index) => ({
    key: index,
    categoryId: ec.certification.certificationCategoryId,
    certificationId: ec.certificationId,
    acquiredDate: toDateInputValue(ec.acquiredDate),
    expirationDate: toDateInputValue(ec.expirationDate),
  }));

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">資格登録</h1>

      <CertificationsForm
        action={saveCertifications}
        categories={categories}
        certifications={certifications}
        initialRows={initialRows}
      />
    </main>
  );
}
