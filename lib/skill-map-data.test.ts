import { describe, expect, it } from "vitest";
import { buildSkillMapAggregate, filterSkillMapAggregate, type EmployeeInput } from "./skill-map-data";
import type { OrganizationUnitRow } from "./organization-unit";

const units: OrganizationUnitRow[] = [
  { id: 1, parentId: null, unitName: "システム事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "開発部", unitLevel: "SECTION" },
  { id: 3, parentId: 2, unitName: "第一Gr", unitLevel: "GROUP" },
  { id: 4, parentId: 1, unitName: "営業部", unitLevel: "SECTION" },
];

const employees: EmployeeInput[] = [
  {
    employeeId: "E001",
    name: "開発 太郎",
    organizationUnitId: 3, // 第一Gr -> 開発部
    skills: [
      { skillId: 1, skillName: "Java", skillCategoryId: 10, skillCategoryName: "プログラミング言語" },
      { skillId: 2, skillName: "AWS", skillCategoryId: 11, skillCategoryName: "クラウド・インフラ" },
    ],
    certifications: [
      {
        certificationId: 100,
        certificationName: "基本情報技術者",
        certificationCategoryId: 200,
        certificationCategoryName: "国家資格",
      },
    ],
  },
  {
    employeeId: "E002",
    name: "営業 花子",
    organizationUnitId: 4, // 営業部
    skills: [{ skillId: 1, skillName: "Java", skillCategoryId: 10, skillCategoryName: "プログラミング言語" }],
    certifications: [],
  },
  {
    employeeId: "E003",
    name: "希少 次郎",
    organizationUnitId: 2, // 開発部
    skills: [{ skillId: 3, skillName: "COBOL", skillCategoryId: 10, skillCategoryName: "プログラミング言語" }],
    certifications: [],
  },
];

const alwaysVisible = () => true;

describe("buildSkillMapAggregate", () => {
  it("集計する: 統計サマリー", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    expect(aggregate.stats).toEqual({
      memberCount: 3,
      skillTypeCount: 3, // Java, AWS, COBOL
      certificationCount: 1,
      rareSkillCount: 2, // AWS, COBOL
    });
  });

  it("スキルをカテゴリ別に分類し、保有者数の多い順に並べる", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    const programming = aggregate.skillCategories.find((c) => c.categoryName === "プログラミング言語");
    expect(programming?.items.map((i) => [i.name, i.holders.length])).toEqual([
      ["Java", 2],
      ["COBOL", 1],
    ]);
  });

  it("資格をカテゴリ別に分類する", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    expect(aggregate.certCategories).toEqual([
      {
        id: 200,
        categoryName: "国家資格",
        items: [
          {
            id: 100,
            name: "基本情報技術者",
            holders: [{ employeeId: "E001", name: "開発 太郎", visible: true }],
          },
        ],
      },
    ]);
  });

  it("部署×スキルカテゴリのヒートマップを実人数(重複なし)で集計する", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    expect(aggregate.heatmap.departments.map((d) => d.name).sort()).toEqual(["営業部", "開発部"].sort());
    expect(aggregate.heatmap.categories.map((c) => c.name)).toEqual([
      "クラウド・インフラ",
      "プログラミング言語",
    ]);
    const devIndex = aggregate.heatmap.departments.findIndex((d) => d.name === "開発部");
    const salesIndex = aggregate.heatmap.departments.findIndex((d) => d.name === "営業部");
    // 開発部: E001(AWS,Java), E003(COBOL) -> クラウド1, プログラミング2
    // 営業部: E002(Java) -> クラウド0, プログラミング1
    expect(aggregate.heatmap.grid[devIndex]).toEqual([1, 2]);
    expect(aggregate.heatmap.grid[salesIndex]).toEqual([0, 1]);
    expect(aggregate.heatmap.max).toBe(2);
  });

  it("保有者1名のスキルを属人化リスクとして抽出する", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    expect(aggregate.riskSkills).toEqual([
      {
        skillId: 2,
        skillName: "AWS",
        categoryName: "クラウド・インフラ",
        holder: { employeeId: "E001", name: "開発 太郎", visible: true },
        departmentName: "開発部",
      },
      {
        skillId: 3,
        skillName: "COBOL",
        categoryName: "プログラミング言語",
        holder: { employeeId: "E003", name: "希少 次郎", visible: true },
        departmentName: "開発部",
      },
    ]);
  });

  it("閲覧不可の保有者は名前を表示しない", () => {
    const canViewName = (employeeId: string) => employeeId === "E001";
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName });
    const java = aggregate.skillCategories
      .flatMap((c) => c.items)
      .find((i) => i.name === "Java");
    expect(java?.holders.find((h) => h.employeeId === "E002")?.visible).toBe(false);
  });

  it("所属組織を持たない社員はヒートマップの集計対象から除外する", () => {
    const noOrgEmployee: EmployeeInput = {
      employeeId: "E999",
      name: "未所属",
      organizationUnitId: null,
      skills: [{ skillId: 4, skillName: "Rust", skillCategoryId: 10, skillCategoryName: "プログラミング言語" }],
      certifications: [],
    };
    const aggregate = buildSkillMapAggregate({
      employees: [...employees, noOrgEmployee],
      units,
      canViewName: alwaysVisible,
    });
    expect(aggregate.heatmap.departments).toHaveLength(2);
    expect(aggregate.stats.memberCount).toBe(4);
  });
});

describe("filterSkillMapAggregate", () => {
  it("空クエリの場合はそのまま返す", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    expect(filterSkillMapAggregate(aggregate, "  ")).toBe(aggregate);
  });

  it("スキル名で絞り込み、該当しないカテゴリは除外する", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    const filtered = filterSkillMapAggregate(aggregate, "aws");
    expect(filtered.skillCategories.map((c) => c.categoryName)).toEqual(["クラウド・インフラ"]);
    expect(filtered.certCategories).toEqual([]);
  });

  it("保有者名(閲覧可能なもののみ)で絞り込む", () => {
    const canViewName = (employeeId: string) => employeeId === "E001";
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName });
    const filtered = filterSkillMapAggregate(aggregate, "花子");
    // E002(営業花子)は閲覧不可のため、氏名検索ではヒットしない
    const programming = filtered.skillCategories.find((c) => c.categoryName === "プログラミング言語");
    expect(programming).toBeUndefined();
  });

  it("統計とヒートマップはクエリの影響を受けない", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    const filtered = filterSkillMapAggregate(aggregate, "aws");
    expect(filtered.stats).toEqual(aggregate.stats);
    expect(filtered.heatmap).toEqual(aggregate.heatmap);
  });

  it("リスク一覧もスキル名で絞り込む", () => {
    const aggregate = buildSkillMapAggregate({ employees, units, canViewName: alwaysVisible });
    const filtered = filterSkillMapAggregate(aggregate, "cobol");
    expect(filtered.riskSkills.map((r) => r.skillName)).toEqual(["COBOL"]);
  });
});
