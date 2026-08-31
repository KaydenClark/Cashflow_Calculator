import { describe, expect, it } from "vitest";
import { assignDateToWindow, buildCashWindows, generateFuturePayDates } from "../src/domain/periods.js";

const statements = [
  { id: "a", payDate: "2026-07-22", periodStart: "2026-07-01", periodEnd: "2026-07-15", netPayCents: 125_435 },
  { id: "b", payDate: "2026-08-07", periodStart: "2026-07-16", periodEnd: "2026-07-31", netPayCents: 125_750 },
  { id: "c", payDate: "2026-08-21", periodStart: "2026-08-01", periodEnd: "2026-08-15", netPayCents: 126_000 },
];

describe("pay-date cash windows", () => {
  it("uses actual semi-monthly pay dates instead of forced 14-day periods", () => {
    const windows = buildCashWindows(statements, { spending: "2026-08-27", payroll: "2026-08-07" });
    expect(windows[0]).toMatchObject({ windowStart: "2026-07-22", windowEnd: "2026-08-06", status: "Actual" });
    expect(windows[1]).toMatchObject({ windowStart: "2026-08-07", windowEnd: "2026-08-20", status: "Actual" });
    expect(windows[2].status).toBe("Provisional");
    expect(assignDateToWindow("2026-08-20", windows)?.id).toBe("b");
  });

  it("forecasts semi-monthly pay dates through the period containing the horizon", () => {
    const dates = generateFuturePayDates("2026-08-07", "2028-12-31");
    expect(dates.at(-1)).toBe("2028-12-22");
    expect(dates.some((date) => date > "2028-12-31")).toBe(false);
  });
});
