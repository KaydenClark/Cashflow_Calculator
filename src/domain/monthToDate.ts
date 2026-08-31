import type { SpendingCategory } from "./types.js";

export type CoverageConfidence = "complete" | "partial" | "none";

export interface MonthToDateTransaction {
  fingerprint: string;
  sourceType: string;
  transactionAt: string;
  signedAmountCents: number;
  description: string;
  treatment: "included" | "excluded" | "unresolved";
  direction: "expense" | "income" | "refund" | "excluded" | "unresolved";
  chosenCategory: SpendingCategory;
}

export interface MonthToDateSource {
  sourceType: string;
  label: string;
  cutoff: string;
}

export interface MonthToDateInput {
  month: string;
  sources: MonthToDateSource[];
  transactions: MonthToDateTransaction[];
  priorMonthCount?: number;
}

export interface MonthToDateCoverage extends MonthToDateSource {
  reachesAsOf: boolean;
  lastInMonth: string | null;
  includedRowCount: number;
  missingDays: number;
}

export interface MonthToDateCategory {
  category: SpendingCategory;
  amountCents: number;
  shareOfOutflow: number | null;
}

export interface MonthToDateDay {
  date: string;
  day: number;
  inflowCents: number;
  outflowCents: number;
  marginCents: number;
  cumulativeMarginCents: number;
}

export interface MonthToDatePace {
  month: string;
  outflowToDayCents: number;
  fullMonthOutflowCents: number;
}

export interface MonthToDateResult {
  month: string;
  monthStart: string;
  monthEnd: string;
  asOf: string;
  daysElapsed: number;
  daysInMonth: number;
  inflowCents: number;
  outflowCents: number;
  marginCents: number;
  outflowRatio: number | null;
  marginRatio: number | null;
  dailyBurnCents: number;
  projectedOutflowCents: number | null;
  categories: MonthToDateCategory[];
  daily: MonthToDateDay[];
  coverage: MonthToDateCoverage[];
  confidence: CoverageConfidence;
  pace: MonthToDatePace[];
  paceDeltaCents: number | null;
  transactions: MonthToDateTransaction[];
}

function monthBounds(month: string): { start: string; end: string; days: number } {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  const days = new Date(Date.UTC(year, index, 0, 12)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(days).padStart(2, "0")}`, days };
}

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

/**
 * The as-of date is the latest date every reporting source can be trusted to
 * describe. When one source never reaches the month at all it cannot pin the
 * as-of date back to the month start, so the sources that do reach the month
 * set the date and the stale source is reported as a coverage gap instead.
 */
export function resolveAsOfDate(month: string, sources: MonthToDateSource[]): string {
  const { start, end } = monthBounds(month);
  const reaching = sources.filter((source) => source.cutoff >= start).map((source) => (source.cutoff > end ? end : source.cutoff));
  if (!reaching.length) return start;
  if (reaching.length === sources.length) return reaching.reduce((earliest, value) => (value < earliest ? value : earliest));
  return reaching.reduce((latest, value) => (value > latest ? value : latest));
}

function outflowForSpan(transactions: MonthToDateTransaction[], start: string, end: string): number {
  let total = 0;
  for (const row of transactions) {
    if (row.treatment !== "included") continue;
    if (row.transactionAt < start || row.transactionAt > end) continue;
    if (row.direction === "expense") total += Math.abs(row.signedAmountCents);
    if (row.direction === "refund") total -= Math.abs(row.signedAmountCents);
  }
  return total;
}

/**
 * Daily inflow and outflow for every elapsed day, including days with no
 * activity, so the chart keeps an even calendar spacing. Refunds net against
 * the day they landed on, matching how the month totals treat them, and the
 * series therefore reconciles to inflowCents, outflowCents, and marginCents.
 */
function dailySeries(included: MonthToDateTransaction[], month: string, daysElapsed: number): MonthToDateDay[] {
  const inflow = new Map<number, number>();
  const outflow = new Map<number, number>();
  for (const row of included) {
    const day = dayOfMonth(row.transactionAt);
    const amount = Math.abs(row.signedAmountCents);
    if (row.direction === "income") inflow.set(day, (inflow.get(day) ?? 0) + amount);
    if (row.direction === "expense") outflow.set(day, (outflow.get(day) ?? 0) + amount);
    if (row.direction === "refund") outflow.set(day, (outflow.get(day) ?? 0) - amount);
  }
  const rows: MonthToDateDay[] = [];
  let cumulative = 0;
  for (let day = 1; day <= daysElapsed; day += 1) {
    const inflowCents = inflow.get(day) ?? 0;
    const outflowCents = outflow.get(day) ?? 0;
    const marginCents = inflowCents - outflowCents;
    cumulative += marginCents;
    rows.push({
      date: `${month}-${String(day).padStart(2, "0")}`,
      day,
      inflowCents,
      outflowCents,
      marginCents,
      cumulativeMarginCents: cumulative,
    });
  }
  return rows;
}

export function buildMonthToDate(input: MonthToDateInput): MonthToDateResult {
  const { start, end, days } = monthBounds(input.month);
  const asOf = resolveAsOfDate(input.month, input.sources);
  const daysElapsed = dayOfMonth(asOf);
  const inMonth = input.transactions
    .filter((row) => row.transactionAt >= start && row.transactionAt <= asOf)
    .sort((a, b) => (a.transactionAt === b.transactionAt ? a.fingerprint.localeCompare(b.fingerprint) : b.transactionAt.localeCompare(a.transactionAt)));
  const included = inMonth.filter((row) => row.treatment === "included");

  const categoryTotals = new Map<SpendingCategory, number>();
  let inflowCents = 0;
  for (const row of included) {
    const amount = Math.abs(row.signedAmountCents);
    if (row.direction === "income") {
      inflowCents += amount;
      continue;
    }
    if (row.direction !== "expense" && row.direction !== "refund") continue;
    const signed = row.direction === "expense" ? amount : -amount;
    categoryTotals.set(row.chosenCategory, (categoryTotals.get(row.chosenCategory) ?? 0) + signed);
  }
  const outflowCents = [...categoryTotals.values()].reduce((sum, value) => sum + value, 0);
  const marginCents = inflowCents - outflowCents;

  const coverage: MonthToDateCoverage[] = input.sources.map((source) => {
    const rows = included.filter((row) => row.sourceType === source.sourceType);
    const missingFrom = source.cutoff < start ? start : source.cutoff;
    return {
      ...source,
      reachesAsOf: source.cutoff >= asOf,
      lastInMonth: rows.length ? rows.map((row) => row.transactionAt).reduce((latest, value) => (value > latest ? value : latest)) : null,
      includedRowCount: rows.length,
      missingDays: source.cutoff >= asOf ? 0 : dayOfMonth(asOf) - (source.cutoff < start ? 0 : dayOfMonth(missingFrom)),
    };
  });
  const confidence: CoverageConfidence = !included.length && coverage.every((row) => !row.reachesAsOf)
    ? "none"
    : coverage.every((row) => row.reachesAsOf) ? "complete" : "partial";

  const priorMonthCount = input.priorMonthCount ?? 3;
  const pace: MonthToDatePace[] = [];
  for (let offset = 1; offset <= priorMonthCount; offset += 1) {
    const month = shiftMonth(input.month, -offset);
    const bounds = monthBounds(month);
    const toDay = Math.min(daysElapsed, bounds.days);
    const cut = `${month}-${String(toDay).padStart(2, "0")}`;
    const fullMonthOutflowCents = outflowForSpan(input.transactions, bounds.start, bounds.end);
    if (!fullMonthOutflowCents) continue;
    pace.push({ month, outflowToDayCents: outflowForSpan(input.transactions, bounds.start, cut), fullMonthOutflowCents });
  }
  // A delta against prior months only means something when this month's sources
  // are as complete as the months it is being compared against.
  const paceDeltaCents = pace.length && confidence === "complete"
    ? outflowCents - Math.round(pace.reduce((sum, row) => sum + row.outflowToDayCents, 0) / pace.length)
    : null;

  const dailyBurnCents = daysElapsed ? Math.round(outflowCents / daysElapsed) : 0;
  return {
    month: input.month,
    monthStart: start,
    monthEnd: end,
    asOf,
    daysElapsed,
    daysInMonth: days,
    inflowCents,
    outflowCents,
    marginCents,
    outflowRatio: inflowCents === 0 ? null : outflowCents / inflowCents,
    marginRatio: inflowCents === 0 ? null : marginCents / inflowCents,
    dailyBurnCents,
    projectedOutflowCents: confidence === "complete" && daysElapsed ? Math.round((outflowCents / daysElapsed) * days) : null,
    categories: [...categoryTotals.entries()]
      .filter(([, amount]) => amount !== 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amountCents]) => ({ category, amountCents, shareOfOutflow: outflowCents ? amountCents / outflowCents : null })),
    daily: dailySeries(included, input.month, daysElapsed),
    coverage,
    confidence,
    pace,
    paceDeltaCents,
    transactions: included,
  };
}
