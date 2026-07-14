import { describe, expect, it } from "vitest";
import { newAccountSchema } from "./schema";

const validInput = {
  employeeId: "123456",
  email: "new.staff@example.com",
  organizationUnitId: "3",
  role: "GENERAL_STAFF",
};

describe("newAccountSchema", () => {
  it("accepts a valid input", () => {
    expect(newAccountSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts an empty organizationUnitId (unaffiliated)", () => {
    const result = newAccountSchema.safeParse({ ...validInput, organizationUnitId: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an employeeId that isn't 6 digits", () => {
    expect(newAccountSchema.safeParse({ ...validInput, employeeId: "12345" }).success).toBe(false);
    expect(newAccountSchema.safeParse({ ...validInput, employeeId: "1234567" }).success).toBe(
      false,
    );
    expect(newAccountSchema.safeParse({ ...validInput, employeeId: "abcdef" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid email", () => {
    expect(newAccountSchema.safeParse({ ...validInput, email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects a missing role", () => {
    expect(newAccountSchema.safeParse({ ...validInput, role: "" }).success).toBe(false);
  });

  it("rejects an invalid role value", () => {
    expect(newAccountSchema.safeParse({ ...validInput, role: "OWNER" }).success).toBe(false);
  });
});
