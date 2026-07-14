import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOrganizationTree,
  resolveOrganizationSelection,
} from "@/lib/organization-unit";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { reinstateAccount, retireAccount, updateAccount } from "./actions";
import { EditAccountForm } from "./EditAccountForm";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { id } = await params;
  const accountId = Number(id);

  const [units, account] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { deletedAt: null },
      orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
    }),
    prisma.userAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { employee: true },
    }),
  ]);

  const organizationTree = buildOrganizationTree(units);
  const initialSelection = resolveOrganizationSelection(units, account.employee.organizationUnitId);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">アカウント編集</h1>

      <div className="flex w-full max-w-lg flex-col gap-1 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">対象社員</p>
        <p className="font-medium">
          {account.employee.name ?? "(未登録)"}({account.employeeId})
        </p>
        <p className="mt-2 text-sm text-gray-500">メールアドレス</p>
        <p className="font-medium">{account.email}</p>
      </div>

      <EditAccountForm
        action={updateAccount.bind(null, accountId)}
        organizationTree={organizationTree}
        initialSelection={initialSelection}
        initialRole={account.role}
      />

      <div className="flex w-full max-w-lg justify-end">
        {account.employee.employmentStatus === "ACTIVE" ? (
          <DeleteConfirmButton
            triggerLabel="退職処理"
            message="この社員を退職処理します。よろしいですか？"
            action={retireAccount.bind(null, accountId)}
          />
        ) : (
          <DeleteConfirmButton
            danger={false}
            triggerLabel="現職に戻す"
            message="この社員を現職に戻します。よろしいですか？"
            action={reinstateAccount.bind(null, accountId)}
          />
        )}
      </div>
    </main>
  );
}
