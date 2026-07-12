import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOrganizationTree,
  expandOrganizationUnitIds,
  findDepartmentId,
  type OrganizationDivisionNode,
} from "@/lib/organization-unit";

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

type Holder = { employeeId: string; name: string; visible: boolean };

function buildHolderLine(holders: Holder[]): string {
  const visibleNames = holders.filter((h) => h.visible).map((h) => h.name);
  const hiddenCount = holders.length - visibleNames.length;
  const parts = [...visibleNames];
  if (hiddenCount > 0) parts.push(`他${hiddenCount}名`);
  return parts.join("、");
}

export default async function SkillMapPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) redirect("/login");

  const { org } = await searchParams;
  const selectedOrgId = org ? Number(org) : null;

  const units = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
  const orgRows = flattenTree(buildOrganizationTree(units));

  const scopeOrgIds = selectedOrgId ? expandOrganizationUnitIds(units, [selectedOrgId]) : null;

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      employmentStatus: "ACTIVE",
      organizationUnitId: scopeOrgIds ? { in: scopeOrgIds } : undefined,
    },
    include: {
      skills: {
        where: { deletedAt: null },
        include: { skill: { include: { skillCategory: true } } },
      },
      certifications: {
        where: { deletedAt: null },
        include: { certification: { include: { certificationCategory: true } } },
      },
    },
  });

  // 一般社員は同一部署の社員のみ氏名表示、それ以外は人数のみ(docs/decisions.md参照)
  let viewerDepartmentId: number | null = null;
  if (viewerRole === "GENERAL_STAFF") {
    const viewer = await prisma.employee.findUniqueOrThrow({ where: { employeeId: viewerEmployeeId } });
    viewerDepartmentId = findDepartmentId(units, viewer.organizationUnitId);
  }

  function canViewName(targetEmployeeId: string, targetOrgUnitId: number | null): boolean {
    if (viewerRole !== "GENERAL_STAFF") return true;
    if (targetEmployeeId === viewerEmployeeId) return true;
    if (viewerDepartmentId === null) return false;
    return findDepartmentId(units, targetOrgUnitId) === viewerDepartmentId;
  }

  type SkillAgg = { skillName: string; categoryName: string; holders: Holder[] };
  const skillAgg = new Map<number, SkillAgg>();
  type CertAgg = { certificationName: string; categoryName: string; holders: Holder[] };
  const certAgg = new Map<number, CertAgg>();

  for (const employee of employees) {
    for (const es of employee.skills) {
      const entry = skillAgg.get(es.skillId) ?? {
        skillName: es.skill.skillName,
        categoryName: es.skill.skillCategory.skillCategoryName,
        holders: [],
      };
      entry.holders.push({
        employeeId: employee.employeeId,
        name: employee.name ?? "(未登録)",
        visible: canViewName(employee.employeeId, employee.organizationUnitId),
      });
      skillAgg.set(es.skillId, entry);
    }
    for (const ec of employee.certifications) {
      const entry = certAgg.get(ec.certificationId) ?? {
        certificationName: ec.certification.certificationName,
        categoryName: ec.certification.certificationCategory.certificationCategoryName,
        holders: [],
      };
      entry.holders.push({
        employeeId: employee.employeeId,
        name: employee.name ?? "(未登録)",
        visible: canViewName(employee.employeeId, employee.organizationUnitId),
      });
      certAgg.set(ec.certificationId, entry);
    }
  }

  const skillByCategory = new Map<string, { skillName: string; holders: Holder[] }[]>();
  for (const entry of skillAgg.values()) {
    const list = skillByCategory.get(entry.categoryName) ?? [];
    list.push({ skillName: entry.skillName, holders: entry.holders });
    skillByCategory.set(entry.categoryName, list);
  }

  const certByCategory = new Map<string, { certificationName: string; holders: Holder[] }[]>();
  for (const entry of certAgg.values()) {
    const list = certByCategory.get(entry.categoryName) ?? [];
    list.push({ certificationName: entry.certificationName, holders: entry.holders });
    certByCategory.set(entry.categoryName, list);
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">スキルマップ／組織ダッシュボード</h1>

      <form method="get" className="flex w-full max-w-2xl gap-2">
        <select
          name="org"
          defaultValue={selectedOrgId ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">全社</option>
          {orgRows.map((row) => (
            <option key={row.id} value={row.id}>
              {"　".repeat(row.depth)}
              {row.unitName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          集計
        </button>
      </form>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">スキル別保有者数</h2>
        {skillByCategory.size === 0 && <p className="text-sm text-gray-500">該当データがありません</p>}
        {[...skillByCategory.entries()].map(([category, list]) => (
          <div key={category} className="mb-3">
            <p className="text-sm font-medium text-gray-600">{category}</p>
            {list.map((item) => (
              <details key={item.skillName} className="ml-2 border-b border-gray-100 py-1">
                <summary className="cursor-pointer text-sm">
                  {item.skillName}({item.holders.length}名)
                </summary>
                <p className="mt-1 ml-4 text-sm text-gray-600">{buildHolderLine(item.holders)}</p>
              </details>
            ))}
          </div>
        ))}
      </section>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">資格別保有者数</h2>
        {certByCategory.size === 0 && <p className="text-sm text-gray-500">該当データがありません</p>}
        {[...certByCategory.entries()].map(([category, list]) => (
          <div key={category} className="mb-3">
            <p className="text-sm font-medium text-gray-600">{category}</p>
            {list.map((item) => (
              <details key={item.certificationName} className="ml-2 border-b border-gray-100 py-1">
                <summary className="cursor-pointer text-sm">
                  {item.certificationName}({item.holders.length}名)
                </summary>
                <p className="mt-1 ml-4 text-sm text-gray-600">{buildHolderLine(item.holders)}</p>
              </details>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
