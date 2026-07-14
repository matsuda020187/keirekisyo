import { findDepartmentId, type OrganizationUnitRow } from "@/lib/organization-unit";

export type Holder = { employeeId: string; name: string; visible: boolean };

export type SkillMapItem = { id: number; name: string; holders: Holder[] };
export type SkillMapCategory = { id: number; categoryName: string; items: SkillMapItem[] };

export type SkillMapStats = {
  memberCount: number;
  skillTypeCount: number;
  certificationCount: number;
  rareSkillCount: number;
};

export type SkillMapHeatmap = {
  departments: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  grid: number[][];
  max: number;
};

export type RiskSkill = {
  skillId: number;
  skillName: string;
  categoryName: string;
  holder: Holder;
  departmentName: string | null;
};

export type SkillMapAggregate = {
  stats: SkillMapStats;
  certCategories: SkillMapCategory[];
  skillCategories: SkillMapCategory[];
  heatmap: SkillMapHeatmap;
  riskSkills: RiskSkill[];
};

export type EmployeeSkillInput = {
  skillId: number;
  skillName: string;
  skillCategoryId: number;
  skillCategoryName: string;
};

export type EmployeeCertificationInput = {
  certificationId: number;
  certificationName: string;
  certificationCategoryId: number;
  certificationCategoryName: string;
};

export type EmployeeInput = {
  employeeId: string;
  name: string | null;
  organizationUnitId: number | null;
  skills: EmployeeSkillInput[];
  certifications: EmployeeCertificationInput[];
};

function sortItemsDesc(items: SkillMapItem[]): SkillMapItem[] {
  return [...items].sort(
    (a, b) => b.holders.length - a.holders.length || a.name.localeCompare(b.name, "ja"),
  );
}

type AggregateEntry = { id: number; name: string; categoryId: number; categoryName: string; holders: Holder[] };

function buildCategories(entries: Map<number, AggregateEntry>): SkillMapCategory[] {
  const byCategory = new Map<number, SkillMapCategory>();
  for (const entry of entries.values()) {
    const category = byCategory.get(entry.categoryId) ?? {
      id: entry.categoryId,
      categoryName: entry.categoryName,
      items: [],
    };
    category.items.push({ id: entry.id, name: entry.name, holders: entry.holders });
    byCategory.set(entry.categoryId, category);
  }
  return [...byCategory.values()]
    .map((category) => ({ ...category, items: sortItemsDesc(category.items) }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "ja"));
}

export function buildSkillMapAggregate(params: {
  employees: EmployeeInput[];
  units: OrganizationUnitRow[];
  canViewName: (employeeId: string, organizationUnitId: number | null) => boolean;
}): SkillMapAggregate {
  const { employees, units, canViewName } = params;

  const skillEntries = new Map<number, AggregateEntry>();
  const certEntries = new Map<number, AggregateEntry>();

  const departmentIdByEmployee = new Map<string, number | null>();
  const departmentNameById = new Map<number, string>();
  for (const unit of units) {
    if (unit.unitLevel === "SECTION") departmentNameById.set(unit.id, unit.unitName);
  }

  for (const employee of employees) {
    const departmentId = findDepartmentId(units, employee.organizationUnitId);
    departmentIdByEmployee.set(employee.employeeId, departmentId);

    const holder: Holder = {
      employeeId: employee.employeeId,
      name: employee.name ?? "(未登録)",
      visible: canViewName(employee.employeeId, employee.organizationUnitId),
    };

    for (const skill of employee.skills) {
      const entry = skillEntries.get(skill.skillId) ?? {
        id: skill.skillId,
        name: skill.skillName,
        categoryId: skill.skillCategoryId,
        categoryName: skill.skillCategoryName,
        holders: [],
      };
      entry.holders.push(holder);
      skillEntries.set(skill.skillId, entry);
    }

    for (const cert of employee.certifications) {
      const entry = certEntries.get(cert.certificationId) ?? {
        id: cert.certificationId,
        name: cert.certificationName,
        categoryId: cert.certificationCategoryId,
        categoryName: cert.certificationCategoryName,
        holders: [],
      };
      entry.holders.push(holder);
      certEntries.set(cert.certificationId, entry);
    }
  }

  const skillCategories = buildCategories(skillEntries);
  const certCategories = buildCategories(certEntries);

  // ヒートマップ: 部署(unit_level=SECTION)×スキルカテゴリの実人数(重複なし)
  const heatmapCategories = skillCategories.map((c) => ({ id: c.id, name: c.categoryName }));
  const categoryIndexById = new Map(heatmapCategories.map((c, index) => [c.id, index]));

  const departmentEmployeeSkillCategories = new Map<number, Map<string, Set<number>>>();
  for (const employee of employees) {
    const departmentId = departmentIdByEmployee.get(employee.employeeId);
    if (departmentId === null || departmentId === undefined) continue;
    const byEmployee = departmentEmployeeSkillCategories.get(departmentId) ?? new Map<string, Set<number>>();
    const categoryIds = byEmployee.get(employee.employeeId) ?? new Set<number>();
    for (const skill of employee.skills) categoryIds.add(skill.skillCategoryId);
    byEmployee.set(employee.employeeId, categoryIds);
    departmentEmployeeSkillCategories.set(departmentId, byEmployee);
  }

  const departmentIds = [...departmentEmployeeSkillCategories.keys()].sort((a, b) => {
    const nameA = departmentNameById.get(a) ?? "";
    const nameB = departmentNameById.get(b) ?? "";
    return nameA.localeCompare(nameB, "ja");
  });

  const grid: number[][] = departmentIds.map((departmentId) => {
    const row = new Array(heatmapCategories.length).fill(0);
    const byEmployee = departmentEmployeeSkillCategories.get(departmentId)!;
    for (const categoryIds of byEmployee.values()) {
      for (const categoryId of categoryIds) {
        const index = categoryIndexById.get(categoryId);
        if (index !== undefined) row[index] += 1;
      }
    }
    return row;
  });

  const max = grid.reduce((acc, row) => Math.max(acc, ...row), 0);

  const heatmap: SkillMapHeatmap = {
    departments: departmentIds.map((id) => ({ id, name: departmentNameById.get(id) ?? "" })),
    categories: heatmapCategories,
    grid,
    max,
  };

  // 属人化リスク: 保有者が1名のみのスキル
  const riskSkills: RiskSkill[] = skillCategories
    .flatMap((category) =>
      category.items
        .filter((item) => item.holders.length === 1)
        .map((item) => {
          const holder = item.holders[0];
          const departmentId = departmentIdByEmployee.get(holder.employeeId);
          return {
            skillId: item.id,
            skillName: item.name,
            categoryName: category.categoryName,
            holder,
            departmentName: departmentId ? (departmentNameById.get(departmentId) ?? null) : null,
          };
        }),
    )
    .sort((a, b) => a.skillName.localeCompare(b.skillName, "ja"));

  const stats: SkillMapStats = {
    memberCount: employees.length,
    skillTypeCount: skillEntries.size,
    certificationCount: certEntries.size,
    rareSkillCount: riskSkills.length,
  };

  return { stats, certCategories, skillCategories, heatmap, riskSkills };
}

export function buildHolderLine(holders: Holder[]): string {
  const visibleNames = holders.filter((h) => h.visible).map((h) => h.name);
  const hiddenCount = holders.length - visibleNames.length;
  const parts = [...visibleNames];
  if (hiddenCount > 0) parts.push(`他${hiddenCount}名`);
  return parts.join("、");
}

function itemMatchesQuery(item: SkillMapItem, query: string): boolean {
  if (item.name.toLowerCase().includes(query)) return true;
  return item.holders.some((h) => h.visible && h.name.toLowerCase().includes(query));
}

// 検索(スキル名・資格名・保有者名)による絞り込み。統計・ヒートマップは対象外(全体像を保つため)。
export function filterSkillMapAggregate(aggregate: SkillMapAggregate, query: string): SkillMapAggregate {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return aggregate;

  const filterCategories = (categories: SkillMapCategory[]): SkillMapCategory[] =>
    categories
      .map((category) => ({ ...category, items: category.items.filter((item) => itemMatchesQuery(item, trimmed)) }))
      .filter((category) => category.items.length > 0);

  return {
    ...aggregate,
    certCategories: filterCategories(aggregate.certCategories),
    skillCategories: filterCategories(aggregate.skillCategories),
    riskSkills: aggregate.riskSkills.filter(
      (risk) =>
        risk.skillName.toLowerCase().includes(trimmed) ||
        (risk.holder.visible && risk.holder.name.toLowerCase().includes(trimmed)),
    ),
  };
}
