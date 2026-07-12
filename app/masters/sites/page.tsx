import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { createSite, deleteSite, updateSite } from "./actions";

export default async function SiteMasterPage({
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

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    orderBy: { siteName: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">現場マスタ管理</h1>

      {error && (
        <p className="w-full max-w-md rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createSite} className="flex w-full max-w-md gap-2">
        <input
          name="siteName"
          maxLength={100}
          required
          placeholder="現場名"
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
        {sites.map((item) =>
          editId === item.id ? (
            <li key={item.id} className="rounded-lg border border-gray-200 p-3">
              <form action={updateSite.bind(null, item.id)} className="flex gap-2">
                <input
                  name="siteName"
                  defaultValue={item.siteName}
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
                <a
                  href="/masters/sites"
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
              <span>{item.siteName}</span>
              <div className="flex gap-2">
                <a
                  href={`/masters/sites?edit=${item.id}`}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  編集
                </a>
                <DeleteConfirmButton
                  message={`「${item.siteName}」を削除してもよろしいですか？`}
                  action={deleteSite.bind(null, item.id)}
                />
              </div>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}
