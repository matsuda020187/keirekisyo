import { describe, expect, it } from "vitest";
import {
  buildOrganizationTree,
  resolveOrganizationSelection,
  resolveOrganizationUnitId,
  type OrganizationUnitRow,
} from "./organization-unit";

const units: OrganizationUnitRow[] = [
  { id: 1, parentId: null, unitName: "システム事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "開発部", unitLevel: "SECTION" },
  { id: 3, parentId: 2, unitName: "第一Gr", unitLevel: "GROUP" },
  { id: 4, parentId: 2, unitName: "第二Gr", unitLevel: "GROUP" },
  { id: 5, parentId: 1, unitName: "営業部", unitLevel: "SECTION" },
  { id: 6, parentId: null, unitName: "管理事業部", unitLevel: "DIVISION" },
];

describe("buildOrganizationTree", () => {
  it("builds a 3-level hierarchy grouped by parent", () => {
    const tree = buildOrganizationTree(units);

    expect(tree).toEqual([
      {
        id: 1,
        unitName: "システム事業部",
        sections: [
          {
            id: 2,
            unitName: "開発部",
            groups: [
              { id: 3, unitName: "第一Gr" },
              { id: 4, unitName: "第二Gr" },
            ],
          },
          { id: 5, unitName: "営業部", groups: [] },
        ],
      },
      { id: 6, unitName: "管理事業部", sections: [] },
    ]);
  });

  it("returns an empty array when there are no units", () => {
    expect(buildOrganizationTree([])).toEqual([]);
  });
});

describe("resolveOrganizationSelection", () => {
  it("resolves all three levels from a group id", () => {
    expect(resolveOrganizationSelection(units, 3)).toEqual({
      divisionId: 1,
      sectionId: 2,
      groupId: 3,
    });
  });

  it("resolves only division/section when the unit is a section", () => {
    expect(resolveOrganizationSelection(units, 5)).toEqual({
      divisionId: 1,
      sectionId: 5,
      groupId: null,
    });
  });

  it("resolves only the division when the unit is a division", () => {
    expect(resolveOrganizationSelection(units, 6)).toEqual({
      divisionId: 6,
      sectionId: null,
      groupId: null,
    });
  });

  it("returns all-null when unitId is null (unaffiliated employee)", () => {
    expect(resolveOrganizationSelection(units, null)).toEqual({
      divisionId: null,
      sectionId: null,
      groupId: null,
    });
  });
});

describe("resolveOrganizationUnitId", () => {
  it("prefers the deepest selected level", () => {
    expect(resolveOrganizationUnitId({ divisionId: 1, sectionId: 2, groupId: 3 })).toBe(3);
    expect(resolveOrganizationUnitId({ divisionId: 1, sectionId: 2, groupId: null })).toBe(2);
    expect(resolveOrganizationUnitId({ divisionId: 1, sectionId: null, groupId: null })).toBe(1);
    expect(resolveOrganizationUnitId({ divisionId: null, sectionId: null, groupId: null })).toBe(
      null,
    );
  });
});
