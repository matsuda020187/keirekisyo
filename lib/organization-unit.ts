import type { OrganizationUnitLevel } from "@/generated/prisma/enums";

export type OrganizationUnitRow = {
  id: number;
  parentId: number | null;
  unitName: string;
  unitLevel: OrganizationUnitLevel;
};

export type OrganizationGroupNode = { id: number; unitName: string };
export type OrganizationSectionNode = {
  id: number;
  unitName: string;
  groups: OrganizationGroupNode[];
};
export type OrganizationDivisionNode = {
  id: number;
  unitName: string;
  sections: OrganizationSectionNode[];
};

export type OrganizationSelection = {
  divisionId: number | null;
  sectionId: number | null;
  groupId: number | null;
};

// organization_unit は自己参照の3階層(事業部>部署>Gr)。REF002/REF007/MST004等、
// 複数画面で同じ階層構築・選択解決ロジックを使うためlibに置く。
export function buildOrganizationTree(units: OrganizationUnitRow[]): OrganizationDivisionNode[] {
  const childrenByParentId = new Map<number | null, OrganizationUnitRow[]>();
  for (const unit of units) {
    const siblings = childrenByParentId.get(unit.parentId) ?? [];
    siblings.push(unit);
    childrenByParentId.set(unit.parentId, siblings);
  }

  const divisions = (childrenByParentId.get(null) ?? []).filter(
    (unit) => unit.unitLevel === "DIVISION",
  );

  return divisions.map((division) => {
    const sections = (childrenByParentId.get(division.id) ?? []).filter(
      (unit) => unit.unitLevel === "SECTION",
    );
    return {
      id: division.id,
      unitName: division.unitName,
      sections: sections.map((section) => {
        const groups = (childrenByParentId.get(section.id) ?? []).filter(
          (unit) => unit.unitLevel === "GROUP",
        );
        return {
          id: section.id,
          unitName: section.unitName,
          groups: groups.map((group) => ({ id: group.id, unitName: group.unitName })),
        };
      }),
    };
  });
}

// employee.organization_unit_id(選択された最下層のid)から、
// 事業部/部署/Grそれぞれの選択状態を逆引きする(EDT001フォームの初期値復元用)。
export function resolveOrganizationSelection(
  units: OrganizationUnitRow[],
  unitId: number | null,
): OrganizationSelection {
  const empty: OrganizationSelection = { divisionId: null, sectionId: null, groupId: null };
  if (unitId === null) return empty;

  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const selection = { ...empty };
  let current = byId.get(unitId);
  while (current) {
    if (current.unitLevel === "GROUP") selection.groupId = current.id;
    else if (current.unitLevel === "SECTION") selection.sectionId = current.id;
    else if (current.unitLevel === "DIVISION") selection.divisionId = current.id;
    current = current.parentId !== null ? byId.get(current.parentId) : undefined;
  }
  return selection;
}

// 事業部/部署/Grの選択から、保存すべき最下層のidを決定する(選択された最下層が優先)。
export function resolveOrganizationUnitId(selection: OrganizationSelection): number | null {
  return selection.groupId ?? selection.sectionId ?? selection.divisionId ?? null;
}
