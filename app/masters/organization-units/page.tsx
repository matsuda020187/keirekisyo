import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOrganizationTree, type OrganizationDivisionNode } from "@/lib/organization-unit";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { createChildUnit, createDivision, deleteOrganizationUnit, updateUnitName } from "./actions";

const BASE_PATH = "/masters/organization-units";

type Row = { id: number; unitName: string; depth: number; canAddChild: boolean };

function flatten(tree: OrganizationDivisionNode[]): Row[] {
  const rows: Row[] = [];
  for (const division of tree) {
    rows.push({ id: division.id, unitName: division.unitName, depth: 0, canAddChild: true });
    for (const section of division.sections) {
      rows.push({ id: section.id, unitName: section.unitName, depth: 1, canAddChild: true });
      for (const group of section.groups) {
        rows.push({ id: group.id, unitName: group.unitName, depth: 2, canAddChild: false });
      }
    }
  }
  return rows;
}

export default async function OrganizationUnitMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; addChild?: string; error?: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { edit, addChild, error } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const addChildParentId = addChild ? Number(addChild) : null;

  const units = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
  const rows = flatten(buildOrganizationTree(units));

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">部署マスタ管理</h1>

      {error && (
        <p className="w-full max-w-lg rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createDivision} className="flex w-full max-w-lg gap-2">
        <input
          name="unitName"
          maxLength={100}
          required
          placeholder="事業部名"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          事業部を追加
        </button>
      </form>

      <ul className="flex w-full max-w-lg flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} style={{ marginLeft: `${row.depth * 1.5}rem` }}>
            {editId === row.id ? (
              <form action={updateUnitName.bind(null, row.id)} className="flex gap-2">
                <input
                  name="unitName"
                  defaultValue={row.unitName}
                  maxLength={100}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  保存
                </button>
                <Link
                  href={BASE_PATH}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </Link>
              </form>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <span>{row.unitName}</span>
                <div className="flex gap-2">
                  {row.canAddChild && (
                    <Link
                      href={`${BASE_PATH}?addChild=${row.id}`}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      配下に追加
                    </Link>
                  )}
                  <Link
                    href={`${BASE_PATH}?edit=${row.id}`}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    編集
                  </Link>
                  <DeleteConfirmButton
                    message={`「${row.unitName}」を削除してもよろしいですか？`}
                    action={deleteOrganizationUnit.bind(null, row.id)}
                  />
                </div>
              </div>
            )}

            {addChildParentId === row.id && (
              <form
                action={createChildUnit.bind(null, row.id)}
                className="mt-2 ml-6 flex gap-2"
              >
                <input
                  name="unitName"
                  maxLength={100}
                  required
                  placeholder="配下の組織名"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  追加
                </button>
                <Link
                  href={BASE_PATH}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </Link>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
