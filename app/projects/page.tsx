import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatMonth(date: Date | null): string {
  if (!date) return "現在";
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

export default async function ProjectListPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const projects = await prisma.project.findMany({
    where: { employeeId, deletedAt: null },
    include: {
      site: true,
      roleLinks: { where: { deletedAt: null }, include: { projectRole: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">プロジェクト経歴一覧</h1>

      <div className="flex w-full max-w-2xl justify-end">
        <Link
          href="/projects/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          新規追加
        </Link>
      </div>

      <ul className="flex w-full max-w-2xl flex-col gap-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div>
              <p className="font-medium">{project.site.siteName}</p>
              <p className="text-sm text-gray-500">
                {formatMonth(project.startDate)} 〜 {formatMonth(project.endDate)} ／{" "}
                {project.roleLinks.map((link) => link.projectRole.projectRoleName).join("、")}
              </p>
            </div>
            <Link
              href={`/projects/${project.id}/edit`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              編集
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/mypage" className="text-sm text-blue-600 hover:underline">
        マイページへ戻る
      </Link>
    </main>
  );
}
