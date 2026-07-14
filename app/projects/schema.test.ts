import { describe, expect, it } from "vitest";
import { PROCESS_FIELDS, projectSchema } from "./schema";

const emptyProcesses = Object.fromEntries(PROCESS_FIELDS.map((f) => [f, false]));

const validInput = {
  siteId: 1,
  projectTitle: "基幹システム再構築",
  industry: "金融",
  startDate: "2020-04",
  isOngoing: false,
  endDate: "2021-03",
  projectSummary: "要件定義から開発まで担当",
  roleIds: [1],
  totalTeamSize: "約50名",
  teamSize: "5名",
  overview: "業務詳細概要",
  processes: { ...emptyProcesses, development: true },
  skills: [{ skillId: 1 }],
};

describe("projectSchema", () => {
  it("accepts a fully filled valid input", () => {
    expect(projectSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts an ongoing project without endDate", () => {
    const result = projectSchema.safeParse({ ...validInput, isOngoing: true, endDate: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a project with neither endDate nor isOngoing (未確定として許容)", () => {
    const result = projectSchema.safeParse({ ...validInput, isOngoing: false, endDate: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing siteId", () => {
    expect(projectSchema.safeParse({ ...validInput, siteId: "" }).success).toBe(false);
  });

  it("rejects a missing projectTitle", () => {
    expect(projectSchema.safeParse({ ...validInput, projectTitle: "" }).success).toBe(false);
  });

  it("rejects an empty roleIds array", () => {
    expect(projectSchema.safeParse({ ...validInput, roleIds: [] }).success).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    const result = projectSchema.safeParse({
      ...validInput,
      startDate: "2021-01",
      endDate: "2020-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts skills with a version", () => {
    const result = projectSchema.safeParse({
      ...validInput,
      skills: [{ skillId: 1, skillVersionId: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty skills array", () => {
    expect(projectSchema.safeParse({ ...validInput, skills: [] }).success).toBe(true);
  });
});
