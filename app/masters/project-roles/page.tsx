import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { createProjectRole, deleteProjectRole, updateProjectRole } from "./actions";

export default async function ProjectRoleMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { edit, error } = await searchParams;
  const editId = edit ? Number(edit) : null;

  const projectRoles = await prisma.projectRole.findMany({
    where: { deletedAt: null },
    orderBy: { projectRoleName: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">現場ポジションマスタ管理</h1>

      {error && (
        <p className="w-full max-w-md rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createProjectRole} className="flex w-full max-w-md gap-2">
        <input
          name="projectRoleName"
          maxLength={20}
          required
          placeholder="役割名（例：SE、PG、リーダー）"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          追加
        </button>
      </form>

      <ul className="flex w-full max-w-md flex-col gap-2">
        {projectRoles.map((item) =>
          editId === item.id ? (
            <li key={item.id} className="rounded-lg border border-gray-200 p-3">
              <form action={updateProjectRole.bind(null, item.id)} className="flex gap-2">
                <input
                  name="projectRoleName"
                  defaultValue={item.projectRoleName}
                  maxLength={20}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  保存
                </button>
                <a
                  href="/masters/project-roles"
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </a>
              </form>
            </li>
          ) : (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
            >
              <span>{item.projectRoleName}</span>
              <div className="flex gap-2">
                <a
                  href={`/masters/project-roles?edit=${item.id}`}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  編集
                </a>
                <DeleteConfirmButton
                  message={`「${item.projectRoleName}」を削除してもよろしいですか？`}
                  action={deleteProjectRole.bind(null, item.id)}
                />
              </div>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}
