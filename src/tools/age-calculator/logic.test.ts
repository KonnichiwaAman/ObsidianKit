import { describe, expect, it } from "vitest";
import { calculateAgeResult } from "./logic";

describe("age calculator logic", () => {
  it("calculates an exact leap-day anniversary", () => {
    expect(calculateAgeResult("2000-02-29", "2024-02-29")).toMatchObject({
      years: 24,
      months: 0,
      days: 0,
      totalMonths: 288,
    });
  });

  it("handles month-end dates without producing negative days", () => {
    expect(calculateAgeResult("2024-01-31", "2024-03-01")).toMatchObject({
      years: 0,
      months: 1,
      days: 1,
      totalDays: 30,
    });
  });

  it.each([
    ["not-a-date", "2024-01-01"],
    ["2024-02-30", "2024-03-01"],
    ["2024-03-01", "2024-02-29"],
  ])("rejects invalid range %s to %s", (start, end) => {
    expect(calculateAgeResult(start, end)).toBeNull();
  });
});
