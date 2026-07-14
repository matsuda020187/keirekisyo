import { describe, expect, it } from "vitest";
import { careerSummarySchema } from "./schema";

describe("careerSummarySchema", () => {
  it("accepts both fields empty", () => {
    const result = careerSummarySchema.safeParse({ careerSummary: "", selfPr: "" });
    expect(result.success).toBe(true);
  });

  it("accepts text within 1000 characters", () => {
    const result = careerSummarySchema.safeParse({
      careerSummary: "あ".repeat(1000),
      selfPr: "い".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects careerSummary over 1000 characters", () => {
    const result = careerSummarySchema.safeParse({
      careerSummary: "あ".repeat(1001),
      selfPr: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects selfPr over 1000 characters", () => {
    const result = careerSummarySchema.safeParse({
      careerSummary: "",
      selfPr: "い".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
