import type { AccountRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  buildOrganizationTree,
  expandOrganizationUnitIds,
  findDepartmentId,
  type OrganizationDivisionNode,
} from "@/lib/organization-unit";
import { buildSkillMapAggregate, type EmployeeInput, type SkillMapAggregate } from "@/lib/skill-map-data";

export type OrgRow = { id: number; unitName: string; depth: number };

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

// REF008の画面表示・Excel出力(app/api/skill-map/export)の両方から呼ばれる共通データ取得。
// 表示内容とExcel出力内容が食い違わないよう、集計ロジック(buildSkillMapAggregate)を必ず共有する。
export async function loadSkillMap(params: {
  selectedOrgId: number | null;
  viewerEmployeeId: string;
  viewerRole: AccountRole;
}): Promise<{ aggregate: SkillMapAggregate; orgRows: OrgRow[] }> {
  const { selectedOrgId, viewerEmployeeId, viewerRole } = params;

  const units = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
  const orgRows = flattenTree(buildOrganizationTree(units));

  const scopeOrgIds = selectedOrgId ? expandOrganizationUnitIds(units, [selectedOrgId]) : null;

  const employeeRows = await prisma.employee.findMany({
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

  const employees: EmployeeInput[] = employeeRows.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    organizationUnitId: employee.organizationUnitId,
    skills: employee.skills.map((es) => ({
      skillId: es.skillId,
      skillName: es.skill.skillName,
      skillCategoryId: es.skill.skillCategoryId,
      skillCategoryName: es.skill.skillCategory.skillCategoryName,
    })),
    certifications: employee.certifications.map((ec) => ({
      certificationId: ec.certificationId,
      certificationName: ec.certification.certificationName,
      certificationCategoryId: ec.certification.certificationCategoryId,
      certificationCategoryName: ec.certification.certificationCategory.certificationCategoryName,
    })),
  }));

  const aggregate = buildSkillMapAggregate({ employees, units, canViewName });

  return { aggregate, orgRows };
}
