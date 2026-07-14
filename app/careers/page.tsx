import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildOrganizationTree,
  expandOrganizationUnitIds,
  findDepartmentId,
  type OrganizationDivisionNode,
} from "@/lib/organization-unit";

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

export default async function CareerListPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    org?: string | string[];
    expMin?: string;
    expMax?: string;
    skill?: string | string[];
    skillMode?: string;
    cert?: string | string[];
    certMode?: string;
    includeRetired?: string;
  }>;
}) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!viewerEmployeeId || !role) redirect("/login");

  const params = await searchParams;
  const name = params.name?.trim() ?? "";
  const selectedOrgIds = toArray(params.org).map(Number);
  const expMin = params.expMin ? Number(params.expMin) : undefined;
  const expMax = params.expMax ? Number(params.expMax) : undefined;
  const selectedSkillIds = toArray(params.skill).map(Number);
  const skillMode = params.skillMode === "AND" ? "AND" : "OR";
  const selectedCertIds = toArray(params.cert).map(Number);
  const certMode = params.certMode === "AND" ? "AND" : "OR";
  const includeRetired = params.includeRetired === "on";

  const [units, allSkills, allCertifications] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { deletedAt: null },
      orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
    }),
    prisma.skill.findMany({ where: { deletedAt: null }, orderBy: { skillName: "asc" } }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      orderBy: { certificationName: "asc" },
    }),
  ]);

  // 一般社員の検索対象組織(自部署+配下のみ選択可)。docs/screens.md REF002参照。
  let departmentScopeIds: number[] | null = null;
  let ownProfileOnly = false;
  let departmentId: number | null = null;
  if (role === "GENERAL_STAFF") {
    const viewer = await prisma.employee.findUniqueOrThrow({ where: { employeeId: viewerEmployeeId } });
    departmentId = findDepartmentId(units, viewer.organizationUnitId);
    if (departmentId === null) {
      ownProfileOnly = true;
    } else {
      departmentScopeIds = expandOrganizationUnitIds(units, [departmentId]);
    }
  }

  // 一般社員は自部署+配下のみを選択肢にする(buildOrganizationTreeは全体ツリー前提のため
  // 部署配下だけに絞ったunits配列を渡すと事業部ルートが欠落し構築できない。直接組み立てる)。
  let orgFilterRows: OrgRow[];
  if (departmentId !== null) {
    const department = units.find((u) => u.id === departmentId)!;
    const groups = units.filter((u) => u.parentId === departmentId && u.unitLevel === "GROUP");
    orgFilterRows = [
      { id: department.id, unitName: department.unitName, depth: 0 },
      ...groups.map((g) => ({ id: g.id, unitName: g.unitName, depth: 1 })),
    ];
  } else if (ownProfileOnly) {
    orgFilterRows = [];
  } else {
    orgFilterRows = flattenTree(buildOrganizationTree(units));
  }

  const employeeWhere: Prisma.EmployeeWhereInput = { deletedAt: null };

  if (ownProfileOnly) {
    employeeWhere.employeeId = viewerEmployeeId;
  } else {
    const requestedOrgIds = selectedOrgIds.length ? expandOrganizationUnitIds(units, selectedOrgIds) : null;
    const effectiveOrgIds = departmentScopeIds
      ? (requestedOrgIds?.filter((id) => departmentScopeIds!.includes(id)) ?? departmentScopeIds)
      : requestedOrgIds;
    if (effectiveOrgIds) {
      employeeWhere.organizationUnitId = { in: effectiveOrgIds };
    }
  }

  if (!includeRetired) {
    employeeWhere.employmentStatus = "ACTIVE";
  }
  if (name) {
    employeeWhere.OR = [{ name: { contains: name } }, { nameKana: { contains: name } }];
  }
  if (expMin !== undefined || expMax !== undefined) {
    employeeWhere.experienceYears = {
      gte: Number.isFinite(expMin) ? expMin : undefined,
      lte: Number.isFinite(expMax) ? expMax : undefined,
    };
  }

  const andConditions: Prisma.EmployeeWhereInput[] = [];
  if (selectedSkillIds.length) {
    if (skillMode === "AND") {
      andConditions.push(
        ...selectedSkillIds.map((skillId) => ({
          skills: { some: { skillId, deletedAt: null } },
        })),
      );
    } else {
      andConditions.push({ skills: { some: { skillId: { in: selectedSkillIds }, deletedAt: null } } });
    }
  }
  if (selectedCertIds.length) {
    if (certMode === "AND") {
      andConditions.push(
        ...selectedCertIds.map((certificationId) => ({
          certifications: { some: { certificationId, deletedAt: null } },
        })),
      );
    } else {
      andConditions.push({
        certifications: { some: { certificationId: { in: selectedCertIds }, deletedAt: null } },
      });
    }
  }
  if (andConditions.length) {
    employeeWhere.AND = andConditions;
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      organizationUnit: true,
      skills: { where: { deletedAt: null }, include: { skill: true }, take: 3 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">経歴書一覧</h1>

      {ownProfileOnly && (
        <p className="w-full max-w-3xl rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          所属組織が未設定のため、閲覧できるのはご自身の経歴書のみです。
        </p>
      )}

      <form method="get" className="flex w-full max-w-3xl flex-col gap-4">
        <details open className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium">基本条件</summary>
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              name="name"
              defaultValue={name}
              maxLength={50}
              placeholder="氏名・カナで検索"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />

            {!ownProfileOnly && (
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">所属組織</p>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
                  {orgFilterRows.map((row) => (
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
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">経験年数</span>
              <input
                type="number"
                name="expMin"
                min={0}
                max={99}
                defaultValue={params.expMin ?? ""}
                className="w-20 rounded-md border border-gray-300 px-2 py-1"
              />
              <span>〜</span>
              <input
                type="number"
                name="expMax"
                min={0}
                max={99}
                defaultValue={params.expMax ?? ""}
                className="w-20 rounded-md border border-gray-300 px-2 py-1"
              />
              <span className="text-sm text-gray-500">年</span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="includeRetired" defaultChecked={includeRetired} />
              退職者を含める
            </label>
          </div>
        </details>

        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium">スキル条件</summary>
          <div className="mt-3 flex flex-col gap-2">
            <label
              className="flex items-center gap-2 text-sm"
              title="AND: 選択した全スキルを持つ人を検索／OR: いずれか1つでも持つ人を検索"
            >
              <input type="checkbox" name="skillMode" value="AND" defaultChecked={skillMode === "AND"} />
              AND検索にする(未チェックはOR検索)
            </label>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {allSkills.map((skill) => (
                <label key={skill.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="skill"
                    value={skill.id}
                    defaultChecked={selectedSkillIds.includes(skill.id)}
                  />
                  {skill.skillName}
                </label>
              ))}
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium">取得資格条件</summary>
          <div className="mt-3 flex flex-col gap-2">
            <label
              className="flex items-center gap-2 text-sm"
              title="AND: 選択した全資格を持つ人を検索／OR: いずれか1つでも持つ人を検索"
            >
              <input type="checkbox" name="certMode" value="AND" defaultChecked={certMode === "AND"} />
              AND検索にする(未チェックはOR検索)
            </label>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {allCertifications.map((certification) => (
                <label key={certification.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="cert"
                    value={certification.id}
                    defaultChecked={selectedCertIds.includes(certification.id)}
                  />
                  {certification.certificationName}
                </label>
              ))}
            </div>
          </div>
        </details>

        <button
          type="submit"
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          検索
        </button>
      </form>

      <ul className="flex w-full max-w-3xl flex-col gap-2">
        {employees.map((employee) => (
          <li
            key={employee.employeeId}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div>
              <p className="font-medium">{employee.name ?? "(未登録)"}</p>
              <p className="text-sm text-gray-500">
                {employee.organizationUnit?.unitName ?? "未所属"} ／ 経験{employee.experienceYears ?? 0}
                年 ／{" "}
                {employee.skills.length > 0
                  ? employee.skills.map((es) => es.skill.skillName).join("、")
                  : "スキル未登録"}
              </p>
            </div>
            <Link
              href={`/careers/${employee.employeeId}`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              詳細
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
