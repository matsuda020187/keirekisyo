import { describe, expect, it } from "vitest";
import { isUniqueConstraintError } from "./prisma-errors";

describe("isUniqueConstraintError", () => {
  it("returns true for a P2002 error object", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
  });

  it("returns false for other Prisma error codes", () => {
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
    expect(isUniqueConstraintError("some string")).toBe(false);
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false);
  });
});
