import { describe, expect, it } from "vitest";
import { calculateExperienceYears } from "./experience-years";

const asOf = new Date(Date.UTC(2026, 6, 1)); // 2026-07-01

describe("calculateExperienceYears", () => {
  it("returns 0 for no projects", () => {
    expect(calculateExperienceYears([], asOf)).toBe(0);
  });

  it("counts exactly 12 months as 1 year", () => {
    const ranges = [{ startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2020, 11, 1)) }];
    expect(calculateExperienceYears(ranges, asOf)).toBe(1);
  });

  it("floors partial years (11 months)", () => {
    const ranges = [{ startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2020, 10, 1)) }];
    expect(calculateExperienceYears(ranges, asOf)).toBe(0);
  });

  it("sums non-overlapping consecutive ranges", () => {
    const ranges = [
      { startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2020, 5, 1)) },
      { startDate: new Date(Date.UTC(2020, 6, 1)), endDate: new Date(Date.UTC(2020, 11, 1)) },
    ];
    expect(calculateExperienceYears(ranges, asOf)).toBe(1);
  });

  it("counts overlapping ranges only once (union)", () => {
    const ranges = [
      { startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2020, 5, 1)) },
      { startDate: new Date(Date.UTC(2020, 3, 1)), endDate: new Date(Date.UTC(2020, 8, 1)) },
    ];
    // union spans 2020-01..2020-09 = 9 months -> floor(9/12) = 0
    expect(calculateExperienceYears(ranges, asOf)).toBe(0);
  });

  it("includes ongoing projects (endDate null) up to asOf", () => {
    const ranges = [{ startDate: new Date(Date.UTC(2025, 0, 1)), endDate: null }];
    // 2025-01 .. 2026-07 inclusive = 19 months -> floor(19/12) = 1
    expect(calculateExperienceYears(ranges, asOf)).toBe(1);
  });

  it("handles unsorted input", () => {
    const ranges = [
      { startDate: new Date(Date.UTC(2021, 0, 1)), endDate: new Date(Date.UTC(2021, 11, 1)) },
      { startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2020, 11, 1)) },
    ];
    expect(calculateExperienceYears(ranges, asOf)).toBe(2);
  });
});
