import { describe, expect, it } from "vitest";
import { editAccountSchema } from "./schema";

describe("editAccountSchema", () => {
  it("accepts a valid input", () => {
    const result = editAccountSchema.safeParse({ organizationUnitId: "5", role: "MANAGER" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty organizationUnitId", () => {
    const result = editAccountSchema.safeParse({ organizationUnitId: "", role: "HR_SALES" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing role", () => {
    expect(editAccountSchema.safeParse({ organizationUnitId: "5", role: "" }).success).toBe(false);
  });

  it("rejects an invalid role value", () => {
    expect(
      editAccountSchema.safeParse({ organizationUnitId: "5", role: "OWNER" }).success,
    ).toBe(false);
  });
});
