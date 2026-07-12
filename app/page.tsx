import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Tile = { href: string; label: string };

export default async function TopPage() {
  const session = await auth();
  const role = session?.user.role;
  const employeeId = session?.user.employeeId;
  if (!role || !employeeId) redirect("/login");

  if (role !== "HR_SALES") {
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { employeeId },
    });
    if (!employee.isRegistered) redirect("/register");
  }

  const tiles: Tile[] = [];
  if (role === "GENERAL_STAFF" || role === "MANAGER") {
    tiles.push({ href: "/mypage", label: "マイページ" });
  }
  tiles.push({ href: "/careers", label: "経歴書一覧" });
  if (role === "MANAGER") {
    tiles.push({ href: "/accounts", label: "アカウント一覧" });
    tiles.push({ href: "/masters", label: "マスタ管理" });
  }
  tiles.push({ href: "/skill-map", label: "スキルマップ／組織ダッシュボード" });

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <h1 className="text-2xl font-bold">トップ</h1>
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <a
            key={tile.href}
            href={tile.href}
            className="flex h-28 items-center justify-center rounded-lg border border-gray-200 p-4 text-center font-medium hover:bg-gray-50"
          >
            {tile.label}
          </a>
        ))}
      </div>
    </main>
  );
}
