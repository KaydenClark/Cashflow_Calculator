import { describe, expect, it } from "vitest";
import { forecastRegularEarningsCents, removeFixedBaseline, scheduleMonthlyOverride } from "../src/domain/forecast.js";

describe("forecast overrides", () => {
  it("applies the raise by earning date and prorates a spanning period", () => {
    const earnings = forecastRegularEarningsCents(
      [
        { date: "2026-08-31", regularHours: 8 },
        { date: "2026-09-01", regularHours: 8 },
      ],
      1900,
      1975,
      "2026-09-01",
    );
    expect(earnings).toBe(31_000);
  });

  it("schedules rent and insurance once per month from the effective month", () => {
    const rent = scheduleMonthlyOverride("2026-09-01", "2026-12-31", 35_000, 1);
    expect(rent).toHaveLength(4);
    expect(rent.map((row) => row.amountCents)).toEqual([35_000, 35_000, 35_000, 35_000]);
  });

  it("removes fixed commitments from the variable baseline", () => {
    expect(removeFixedBaseline({ Rent: 35_000, Insurance: 19_800, Groceries: 28_000 }, ["Rent", "Insurance"])).toEqual({ Groceries: 28_000 });
  });
});
