import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOrganizationTree } from "@/lib/organization-unit";
import { createAccount } from "./actions";
import { NewAccountForm } from "./NewAccountForm";

export default async function NewAccountPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const units = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
  const organizationTree = buildOrganizationTree(units);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">新規アカウント登録</h1>
      <NewAccountForm action={createAccount} organizationTree={organizationTree} />
    </main>
  );
}
