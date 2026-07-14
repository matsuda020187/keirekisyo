import { describe, expect, it } from "vitest";
import { certificationsSchema } from "./schema";

describe("certificationsSchema", () => {
  it("accepts an empty rows array", () => {
    expect(certificationsSchema.safeParse({ rows: [] }).success).toBe(true);
  });

  it("accepts a valid row without expirationDate", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 1, acquiredDate: "2020-01-01" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid row with expirationDate after acquiredDate", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 1, acquiredDate: "2020-01-01", expirationDate: "2099-01-01" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing certificationId", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 0, acquiredDate: "2020-01-01" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an acquiredDate in the future", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 1, acquiredDate: "2099-01-01" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an expirationDate before or equal to acquiredDate", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 1, acquiredDate: "2020-06-01", expirationDate: "2020-01-01" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing acquiredDate", () => {
    const result = certificationsSchema.safeParse({
      rows: [{ certificationId: 1, acquiredDate: "" }],
    });
    expect(result.success).toBe(false);
  });
});
