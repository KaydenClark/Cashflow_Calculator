import { describe, expect, it } from "vitest";
import { buildMonthToDate, resolveAsOfDate } from "../src/domain/monthToDate.js";
import type { MonthToDateInput } from "../src/domain/monthToDate.js";

function transaction(overrides: Partial<MonthToDateInput["transactions"][number]>): MonthToDateInput["transactions"][number] {
  return {
    fingerprint: `fp-${Math.random()}`,
    sourceType: "bank",
    transactionAt: "2026-08-05",
    signedAmountCents: -1_000,
    description: "Test row",
    treatment: "included",
    direction: "expense",
    chosenCategory: "Groceries",
    ...overrides,
  };
}

const sources: MonthToDateInput["sources"] = [
  { sourceType: "bank", label: "Bank", cutoff: "2026-08-27" },
  { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-27" },
];

describe("month-to-date as-of resolution", () => {
  it("uses the earliest source cutoff inside the month", () => {
    expect(resolveAsOfDate("2026-08", [
      { sourceType: "bank", label: "Bank", cutoff: "2026-08-20" },
      { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-27" },
    ])).toBe("2026-08-20");
  });

  it("falls back to the latest in-month cutoff when a source never reaches the month", () => {
    expect(resolveAsOfDate("2026-08", [
      { sourceType: "bank", label: "Bank", cutoff: "2026-07-31" },
      { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-27" },
    ])).toBe("2026-08-27");
  });

  it("returns the month start when no source reaches the month", () => {
    expect(resolveAsOfDate("2026-08", [{ sourceType: "bank", label: "Bank", cutoff: "2026-06-30" }])).toBe("2026-08-01");
  });
});

describe("month-to-date aggregation", () => {
  it("sums included rows, nets refunds, and reconciles categories to outflow", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources,
      transactions: [
        transaction({ transactionAt: "2026-08-02", signedAmountCents: -12_500, chosenCategory: "Groceries" }),
        transaction({ transactionAt: "2026-08-04", signedAmountCents: -4_000, chosenCategory: "Restaurants & Fast Food" }),
        transaction({ transactionAt: "2026-08-06", signedAmountCents: 1_500, direction: "refund", chosenCategory: "Groceries" }),
        transaction({ transactionAt: "2026-08-07", signedAmountCents: 90_000, direction: "income", chosenCategory: "Groceries" }),
      ],
    });
    expect(result.inflowCents).toBe(90_000);
    expect(result.outflowCents).toBe(15_000);
    expect(result.marginCents).toBe(75_000);
    expect(result.categories.find((row) => row.category === "Groceries")?.amountCents).toBe(11_000);
    expect(result.categories.reduce((sum, row) => sum + row.amountCents, 0)).toBe(result.outflowCents);
  });

  it("ignores excluded rows, other months, and rows after the as-of date", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [{ sourceType: "bank", label: "Bank", cutoff: "2026-08-10" }, { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-10" }],
      transactions: [
        transaction({ transactionAt: "2026-08-03", signedAmountCents: -5_000 }),
        transaction({ transactionAt: "2026-08-03", signedAmountCents: -9_900, treatment: "excluded", direction: "excluded" }),
        transaction({ transactionAt: "2026-07-31", signedAmountCents: -7_700 }),
        transaction({ transactionAt: "2026-08-22", signedAmountCents: -8_800 }),
      ],
    });
    expect(result.asOf).toBe("2026-08-10");
    expect(result.outflowCents).toBe(5_000);
  });
});

describe("month-to-date source coverage", () => {
  it("marks a source stale and counts its missing days", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [
        { sourceType: "bank", label: "Bank", cutoff: "2026-07-31" },
        { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-27" },
      ],
      transactions: [transaction({ sourceType: "venmo", transactionAt: "2026-08-05", signedAmountCents: -3_000 })],
    });
    const bank = result.coverage.find((row) => row.sourceType === "bank")!;
    expect(bank.reachesAsOf).toBe(false);
    expect(bank.missingDays).toBe(27);
    expect(bank.lastInMonth).toBeNull();
    expect(result.confidence).toBe("partial");
    expect(result.projectedOutflowCents).toBeNull();
  });

  it("reports complete confidence and projects a full month when every source is current", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [{ sourceType: "bank", label: "Bank", cutoff: "2026-08-10" }],
      transactions: [
        transaction({ transactionAt: "2026-08-01", signedAmountCents: -10_000 }),
        transaction({ transactionAt: "2026-08-10", signedAmountCents: -10_000 }),
      ],
    });
    expect(result.confidence).toBe("complete");
    expect(result.daysElapsed).toBe(10);
    expect(result.daysInMonth).toBe(31);
    expect(result.projectedOutflowCents).toBe(62_000);
  });
});

describe("month-to-date pace comparison", () => {
  it("truncates prior months to the same day of month", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [{ sourceType: "bank", label: "Bank", cutoff: "2026-08-10" }],
      transactions: [
        transaction({ transactionAt: "2026-08-05", signedAmountCents: -20_000 }),
        transaction({ transactionAt: "2026-07-05", signedAmountCents: -30_000 }),
        transaction({ transactionAt: "2026-07-20", signedAmountCents: -50_000 }),
        transaction({ transactionAt: "2026-06-09", signedAmountCents: -10_000 }),
      ],
      priorMonthCount: 2,
    });
    expect(result.pace.map((row) => [row.month, row.outflowToDayCents, row.fullMonthOutflowCents])).toEqual([
      ["2026-07", 30_000, 80_000],
      ["2026-06", 10_000, 10_000],
    ]);
    expect(result.paceDeltaCents).toBe(0);
  });

  it("withholds the pace delta when a source is stale for the month", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [
        { sourceType: "bank", label: "Bank", cutoff: "2026-07-31" },
        { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-10" },
      ],
      transactions: [
        transaction({ sourceType: "venmo", transactionAt: "2026-08-05", signedAmountCents: -2_000 }),
        transaction({ transactionAt: "2026-07-05", signedAmountCents: -30_000 }),
      ],
      priorMonthCount: 1,
    });
    expect(result.confidence).toBe("partial");
    expect(result.pace).toHaveLength(1);
    expect(result.paceDeltaCents).toBeNull();
  });
});

describe("month-to-date daily series", () => {
  it("emits one row per elapsed day and reconciles to the month totals", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [{ sourceType: "bank", label: "Bank", cutoff: "2026-08-04" }],
      transactions: [
        transaction({ transactionAt: "2026-08-01", signedAmountCents: -12_000 }),
        transaction({ transactionAt: "2026-08-03", signedAmountCents: 90_000, direction: "income" }),
        transaction({ transactionAt: "2026-08-03", signedAmountCents: -5_000 }),
        transaction({ transactionAt: "2026-08-03", signedAmountCents: 2_000, direction: "refund" }),
        transaction({ transactionAt: "2026-08-04", signedAmountCents: -9_900, treatment: "excluded", direction: "excluded" }),
      ],
    });
    expect(result.daily.map((row) => [row.date, row.inflowCents, row.outflowCents, row.marginCents, row.cumulativeMarginCents])).toEqual([
      ["2026-08-01", 0, 12_000, -12_000, -12_000],
      ["2026-08-02", 0, 0, 0, -12_000],
      ["2026-08-03", 90_000, 3_000, 87_000, 75_000],
      ["2026-08-04", 0, 0, 0, 75_000],
    ]);
    expect(result.daily.reduce((sum, row) => sum + row.inflowCents, 0)).toBe(result.inflowCents);
    expect(result.daily.reduce((sum, row) => sum + row.outflowCents, 0)).toBe(result.outflowCents);
    expect(result.daily.at(-1)?.cumulativeMarginCents).toBe(result.marginCents);
  });

  it("stops the series at the as-of date instead of the month end", () => {
    const result = buildMonthToDate({
      month: "2026-08",
      sources: [
        { sourceType: "bank", label: "Bank", cutoff: "2026-08-02" },
        { sourceType: "venmo", label: "Venmo", cutoff: "2026-08-27" },
      ],
      transactions: [
        transaction({ sourceType: "venmo", transactionAt: "2026-08-01", signedAmountCents: -3_000 }),
        transaction({ sourceType: "venmo", transactionAt: "2026-08-09", signedAmountCents: -4_000 }),
      ],
    });
    expect(result.asOf).toBe("2026-08-02");
    expect(result.daily).toHaveLength(2);
    expect(result.daily.map((row) => row.day)).toEqual([1, 2]);
    expect(result.daily.reduce((sum, row) => sum + row.outflowCents, 0)).toBe(result.outflowCents);
  });
});
