import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOrganizationTree,
  expandOrganizationUnitIds,
  type OrganizationDivisionNode,
} from "@/lib/organization-unit";

const ROLE_OPTIONS = [
  { value: "GENERAL_STAFF", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
] as const;

const STATUS_OPTIONS = [
  { value: "UNREGISTERED", label: "初回未登録" },
  { value: "ACTIVE", label: "在籍中" },
  { value: "RETIRED", label: "退職" },
] as const;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

type OrgRow = { id: number; unitName: string; depth: number };

function flattenTree(tree: OrganizationDivisionNode[]): OrgRow[] {
  const rows: OrgRow[] = [];
  for (const division of tree) {
    rows.push({ id: division.id, unitName: division.unitName, depth: 0 });
    for (const section of division.sections) {
      rows.push({ id: section.id, unitName: section.unitName, depth: 1 });
      for (const group of section.groups) {
        rows.push({ id: group.id, unitName: group.unitName, depth: 2 });
      }
    }
  }
  return rows;
}

export default async function AccountListPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    org?: string | string[];
    role?: string | string[];
    status?: string | string[];
  }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  // REF007は画面一覧(docs/screens.md)上は管理職専用画面。
  if (role !== "MANAGER") redirect("/");

  const params = await searchParams;
  const name = params.name?.trim() ?? "";
  const selectedOrgIds = toArray(params.org).map(Number);
  const selectedRoles = toArray(params.role);
  const selectedStatuses = toArray(params.status);

  const units = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
  const orgRows = flattenTree(buildOrganizationTree(units));
  const expandedOrgIds = expandOrganizationUnitIds(units, selectedOrgIds);

  const statusClauses = selectedStatuses.map((status) => {
    if (status === "UNREGISTERED") return { isRegistered: false };
    if (status === "ACTIVE") return { isRegistered: true, employmentStatus: "ACTIVE" as const };
    return { employmentStatus: "RETIRED" as const };
  });

  const accounts = await prisma.userAccount.findMany({
    where: {
      deletedAt: null,
      role: selectedRoles.length ? { in: selectedRoles as never[] } : undefined,
      employee: {
        deletedAt: null,
        organizationUnitId: expandedOrgIds.length ? { in: expandedOrgIds } : undefined,
        AND: [
          name ? { OR: [{ name: { contains: name } }, { nameKana: { contains: name } }] } : {},
          statusClauses.length ? { OR: statusClauses } : {},
        ],
      },
    },
    include: { employee: { include: { organizationUnit: true } } },
    orderBy: { employee: { name: "asc" } },
  });

  function statusLabel(isRegistered: boolean, employmentStatus: string): string {
    if (employmentStatus === "RETIRED") return "退職";
    if (!isRegistered) return "初回未登録";
    return "在籍中";
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">アカウント一覧</h1>

      <form method="get" className="flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <input
          type="text"
          name="name"
          defaultValue={name}
          placeholder="氏名・カナで検索"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">所属組織</p>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
            {orgRows.map((row) => (
              <label
                key={row.id}
                style={{ marginLeft: `${row.depth * 1.25}rem` }}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="org"
                  value={row.id}
                  defaultChecked={selectedOrgIds.includes(row.id)}
                />
                {row.unitName}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">権限</p>
          <div className="flex gap-4">
            {ROLE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="role"
                  value={option.value}
                  defaultChecked={selectedRoles.includes(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">状態</p>
          <div className="flex gap-4">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="status"
                  value={option.value}
                  defaultChecked={selectedStatuses.includes(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Link
            href="/accounts/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            新規アカウント登録
          </Link>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            検索
          </button>
        </div>
      </form>

      <ul className="flex w-full max-w-3xl flex-col gap-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <div>
              <p className="font-medium">{account.employee.name ?? "(未登録)"}</p>
              <p className="text-sm text-gray-500">
                {account.employee.organizationUnit?.unitName ?? "未所属"} ／{" "}
                {ROLE_OPTIONS.find((o) => o.value === account.role)?.label} ／{" "}
                {statusLabel(account.employee.isRegistered, account.employee.employmentStatus)} ／
                最終ログイン:{" "}
                {account.lastLoginAt ? account.lastLoginAt.toLocaleString("ja-JP") : "-"}
              </p>
            </div>
            <Link
              href={`/accounts/${account.id}/edit`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              編集
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
