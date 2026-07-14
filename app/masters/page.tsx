import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type MasterLink = { label: string; href?: string };

const MASTER_LINKS: MasterLink[] = [
  { label: "スキルマスタ管理", href: "/masters/skills" },
  { label: "資格マスタ管理", href: "/masters/certifications" },
  { label: "現場ポジションマスタ管理", href: "/masters/project-roles" },
  { label: "部署マスタ管理", href: "/masters/organization-units" },
  { label: "現場マスタ管理", href: "/masters/sites" },
];

export default async function MastersPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">マスタ管理</h1>

      <div className="flex w-full max-w-md flex-col gap-3">
        {MASTER_LINKS.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <span>{item.label}</span>
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                開く
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
