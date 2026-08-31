import type { CashWindow, PayStatement } from "./types.js";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function previousBusinessDay(iso: string): string {
  let candidate = iso;
  const day = new Date(`${candidate}T12:00:00Z`).getUTCDay();
  if (day === 6) candidate = addDays(candidate, -1);
  if (day === 0) candidate = addDays(candidate, -2);
  return candidate;
}

export function buildCashWindows(
  _payStatements: PayStatement[],
  _sourceCutoffs: { spending: string; payroll: string },
): CashWindow[] {
  const sorted = [..._payStatements].sort((a, b) => a.payDate.localeCompare(b.payDate));
  const latestKnownDate = [_sourceCutoffs.spending, _sourceCutoffs.payroll].sort().at(-1)!;
  return sorted.map((statement, index) => {
    const next = sorted[index + 1];
    const windowEnd = next ? addDays(next.payDate, -1) : latestKnownDate;
    const complete = Boolean(next) && _sourceCutoffs.spending >= windowEnd && _sourceCutoffs.payroll >= statement.payDate;
    return {
      ...statement,
      windowStart: statement.payDate,
      windowEnd,
      status: complete ? "Actual" : "Provisional",
    };
  });
}

export function assignDateToWindow(_date: string, _windows: CashWindow[]): CashWindow | undefined {
  return _windows.find((window) => _date >= window.windowStart && _date <= window.windowEnd);
}

export function generateFuturePayDates(_lastPayDate: string, _horizon: string): string[] {
  const last = new Date(`${_lastPayDate}T12:00:00Z`);
  const result: string[] = [];
  let year = last.getUTCFullYear();
  let month = last.getUTCMonth();

  while (true) {
    for (const day of [7, 22]) {
      const nominal = new Date(Date.UTC(year, month, day, 12));
      const shifted = previousBusinessDay(nominal.toISOString().slice(0, 10));
      if (shifted > _lastPayDate && shifted <= _horizon) result.push(shifted);
    }
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
    const firstNextMonth = new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 10);
    if (firstNextMonth > _horizon) break;
  }

  return result.sort();
}
