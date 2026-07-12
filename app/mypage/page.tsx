import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SummaryRow = {
  label: string;
  detail: string;
  href?: string; // 遷移先が未実装の間はリンクを出さない
  linkLabel?: string;
};

export default async function MyPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  // 人事・営業はマイページを持たない(docs/decisions.md参照)
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { employeeId },
    include: {
      _count: {
        select: { skills: true, certifications: true, projects: true },
      },
    },
  });

  if (!employee.isRegistered) redirect("/register");

  const rows: SummaryRow[] = [
    { label: "基本情報", detail: employee.name ?? "未登録", href: "/register" },
    {
      label: "経歴概要・自己PR",
      detail: employee.careerSummary ? "登録済み" : "未登録",
      href: "/career-summary",
    },
    { label: "スキル", detail: `${employee._count.skills}件`, href: "/skills" },
    {
      label: "資格",
      detail: `${employee._count.certifications}件`,
      href: "/certifications",
    },
    {
      label: "プロジェクト経歴",
      detail: `${employee._count.projects}件`,
      href: "/projects",
      linkLabel: "一覧",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">マイページ</h1>

      <div className="flex w-full max-w-xl flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-sm text-gray-500">{row.detail}</p>
            </div>
            {row.href ? (
              <Link
                href={row.href}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                {row.linkLabel ?? "編集"}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">準備中</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
