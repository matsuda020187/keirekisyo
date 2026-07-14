import { describe, expect, it } from "vitest";
import { skillsSchema } from "./schema";

describe("skillsSchema", () => {
  it("accepts an empty rows array", () => {
    expect(skillsSchema.safeParse({ rows: [] }).success).toBe(true);
  });

  it("accepts a valid row without a version", () => {
    const result = skillsSchema.safeParse({
      rows: [{ skillId: 1, skillLevel: "EXPERT" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid row with a version", () => {
    const result = skillsSchema.safeParse({
      rows: [{ skillId: 1, skillVersionId: 2, skillLevel: "PROFICIENT" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing skillId", () => {
    const result = skillsSchema.safeParse({ rows: [{ skillId: 0, skillLevel: "BASIC" }] });
    expect(result.success).toBe(false);
  });

  it("rejects a missing skillLevel", () => {
    const result = skillsSchema.safeParse({ rows: [{ skillId: 1, skillLevel: "" }] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid skillLevel value", () => {
    const result = skillsSchema.safeParse({ rows: [{ skillId: 1, skillLevel: "MASTER" }] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate skillId+skillVersionId combinations", () => {
    const result = skillsSchema.safeParse({
      rows: [
        { skillId: 1, skillVersionId: 2, skillLevel: "EXPERT" },
        { skillId: 1, skillVersionId: 2, skillLevel: "BASIC" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("allows the same skillId with different skillVersionId", () => {
    const result = skillsSchema.safeParse({
      rows: [
        { skillId: 1, skillVersionId: 2, skillLevel: "EXPERT" },
        { skillId: 1, skillVersionId: 3, skillLevel: "BASIC" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
