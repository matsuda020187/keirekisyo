import { describe, expect, it } from "vitest";
import { basicInfoSchema } from "./schema";

const validInput = {
  name: "山田太郎",
  nameKana: "ヤマダタロウ",
  birthDate: "1990-04-01",
  gender: "MALE",
  organizationUnitId: "3",
  nearestStationLine: "JR山手線",
  nearestStationName: "渋谷駅",
  finalSchoolType: "UNIVERSITY",
  finalSchoolName: "〇〇大学",
  finalDepartmentName: "工学部",
  graduationStatus: "GRADUATED",
  graduationYearMonth: "2013-03",
};

describe("basicInfoSchema", () => {
  it("accepts a fully filled valid input", () => {
    const result = basicInfoSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts required fields only (all optional fields empty)", () => {
    const result = basicInfoSchema.safeParse({
      name: "山田太郎",
      nameKana: "ヤマダタロウ",
      birthDate: "1990-04-01",
      gender: "",
      organizationUnitId: "",
      nearestStationLine: "",
      nearestStationName: "",
      finalSchoolType: "",
      finalSchoolName: "",
      finalDepartmentName: "",
      graduationStatus: "",
      graduationYearMonth: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 50 characters", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, name: "あ".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("rejects kana containing non-katakana characters", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, nameKana: "やまだたろう" });
    expect(result.success).toBe(false);
  });

  it("rejects kana containing half-width or ascii characters", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, nameKana: "Yamada" });
    expect(result.success).toBe(false);
  });

  it("accepts kana containing the long vowel mark", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, nameKana: "スズキケーコ" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing birth date", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, birthDate: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid gender value", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, gender: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed graduation year-month", () => {
    const result = basicInfoSchema.safeParse({ ...validInput, graduationYearMonth: "2013/03" });
    expect(result.success).toBe(false);
  });
});
