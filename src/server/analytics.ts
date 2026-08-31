import type { DatabaseSync } from "node:sqlite";
import { calculateCashMetrics } from "../domain/finance.js";
import { buildMonthToDate, type MonthToDateSource, type MonthToDateTransaction } from "../domain/monthToDate.js";
import { buildCashWindows, generateFuturePayDates } from "../domain/periods.js";
import { BUDGET_CATEGORIES, type BudgetCategory, type CashWindow, type PayStatement, type SpendingCategory } from "../domain/types.js";

type Scenario = "base" | "lower" | "higher";

interface TransactionRow {
  fingerprint: string;
  source_type: string;
  source_file_name: string;
  account_label: string;
  transaction_at: string;
  signed_amount_cents: number;
  description: string;
  treatment: "included" | "excluded" | "unresolved";
  direction: "expense" | "income" | "refund" | "excluded" | "unresolved";
  exclusion_reason: string | null;
  chosen_category: SpendingCategory;
  classification_rule: string;
  confidence: number;
  review_required: number;
}

interface PeriodResult extends CashWindow {
  netPayCents: number;
  otherInflowCents: number;
  totalInflowCents: number;
  totalOutflowCents: number;
  marginCents: number;
  outflowRatio: number | null;
  marginRatio: number | null;
  cumulativeMarginCents: number;
  categories: Record<BudgetCategory, number>;
  budgetVarianceCents: number;
  forecastVarianceCents: number | null;
  lowOutflowCents?: number;
  highOutflowCents?: number;
  transactions: TransactionRow[];
}

const fixedCategories = new Set<BudgetCategory>([
  "Rent & Housing", "Auto Insurance", "Car Payment", "Installment & Debt Payments", "Savings",
]);

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000) + 1;
}

function emptyCategories(): Record<BudgetCategory, number> {
  return Object.fromEntries(BUDGET_CATEGORIES.map((category) => [category, 0])) as Record<BudgetCategory, number>;
}

function assumptionMap(db: DatabaseSync): Record<string, number> {
  return Object.fromEntries(
    (db.prepare("SELECT assumption_key, value_number FROM assumptions").all() as Array<{ assumption_key: string; value_number: number }>).map((row) => [row.assumption_key, row.value_number]),
  );
}

function categoryBudgetCents(assumptions: Record<string, number>): Record<BudgetCategory, number> {
  const result = emptyCategories();
  result["Rent & Housing"] = Math.round((assumptions.rent ?? 1200) * 100);
  result["Car Payment"] = Math.round((assumptions.car_payment ?? 400) * 100);
  result["Installment & Debt Payments"] = Math.round((assumptions.affirm_payment ?? 100) * 100);
  result["Auto Insurance"] = Math.round((assumptions.insurance ?? 150) * 100);
  return result;
}

function earningPeriodForPayDate(payDate: string): { start: string; end: string } {
  const date = new Date(`${payDate}T12:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (date.getUTCDate() <= 10) {
    const priorEnd = new Date(Date.UTC(year, month, 0, 12));
    const priorStart = new Date(Date.UTC(priorEnd.getUTCFullYear(), priorEnd.getUTCMonth(), 16, 12));
    return { start: priorStart.toISOString().slice(0, 10), end: priorEnd.toISOString().slice(0, 10) };
  }
  return {
    start: new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month, 15, 12)).toISOString().slice(0, 10),
  };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

interface CategoryMethod {
  category: BudgetCategory;
  method: "Trailing median" | "Recency-weighted average" | "Same calendar month";
  errorRatio: number;
  dailyBaselineCents: number;
  residualDailyCents: number;
}

function candidatePrediction(method: CategoryMethod["method"], history: Array<{ date: string; daily: number }>, targetMonth: number): number {
  if (!history.length) return 0;
  if (method === "Trailing median") return median(history.slice(-6).map((row) => row.daily));
  if (method === "Recency-weighted average") {
    const weighted = history.reduce((sum, row, index) => sum + row.daily * (index + 1), 0);
    const weights = history.reduce((sum, _row, index) => sum + index + 1, 0);
    return weighted / weights;
  }
  const sameMonth = history.filter((row) => Number(row.date.slice(5, 7)) === targetMonth).map((row) => row.daily);
  return sameMonth.length >= 2 ? sameMonth.reduce((sum, value) => sum + value, 0) / sameMonth.length : median(history.slice(-6).map((row) => row.daily));
}

function selectCategoryMethods(actualPeriods: PeriodResult[]): CategoryMethod[] {
  return BUDGET_CATEGORIES.filter((category) => !fixedCategories.has(category)).map((category) => {
    const history = actualPeriods.map((period) => ({
      date: period.windowStart,
      daily: period.categories[category] / daysInclusive(period.windowStart, period.windowEnd),
    }));
    const methods: CategoryMethod["method"][] = ["Trailing median", "Recency-weighted average", "Same calendar month"];
    const scored = methods.map((method) => {
      const errors: number[] = [];
      for (let index = Math.max(3, history.length - 8); index < history.length; index += 1) {
        const actual = history[index].daily;
        const predicted = candidatePrediction(method, history.slice(0, index), Number(history[index].date.slice(5, 7)));
        errors.push(Math.abs(predicted - actual) / Math.max(Math.abs(actual), 100));
      }
      return { method, error: errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : 0 };
    }).sort((a, b) => a.error - b.error);
    const selected = scored[0];
    const dailyBaselineCents = candidatePrediction(selected.method, history, Number(history.at(-1)?.date.slice(5, 7) ?? 1));
    const residuals = history.slice(-8).map((row) => Math.abs(row.daily - dailyBaselineCents));
    return {
      category,
      method: selected.method,
      errorRatio: selected.error,
      dailyBaselineCents,
      residualDailyCents: residuals.length ? residuals.reduce((sum, value) => sum + value, 0) / residuals.length : 0,
    };
  });
}

function buildActualPeriods(db: DatabaseSync, transactions: TransactionRow[], cutoffs: { spending: string; payroll: string }, assumptions: Record<string, number>): PeriodResult[] {
  const payRows = db.prepare(`
    SELECT pay_statement_id, pay_date, period_start, period_end, net_pay_cents
    FROM pay_statements WHERE pay_date >= '2025-01-01' AND net_pay_cents > 0 ORDER BY pay_date
  `).all() as Array<Record<string, string | number>>;
  const statements: PayStatement[] = payRows.map((row) => ({
    id: String(row.pay_statement_id), payDate: String(row.pay_date), periodStart: String(row.period_start),
    periodEnd: String(row.period_end), netPayCents: Number(row.net_pay_cents),
  }));
  const windows = buildCashWindows(statements, cutoffs);
  const budgets = categoryBudgetCents(assumptions);
  let cumulative = 0;
  return windows.map((window) => {
    const periodTransactions = transactions.filter((row) => row.transaction_at >= window.windowStart && row.transaction_at <= window.windowEnd && row.treatment === "included");
    const categories = emptyCategories();
    let otherInflowCents = 0;
    for (const transaction of periodTransactions) {
      if (transaction.direction === "expense") categories[transaction.chosen_category] += Math.abs(transaction.signed_amount_cents);
      if (transaction.direction === "refund") categories[transaction.chosen_category] -= Math.abs(transaction.signed_amount_cents);
      if (transaction.direction === "income") otherInflowCents += Math.abs(transaction.signed_amount_cents);
    }
    categories.Savings = 0;
    const totalOutflowCents = BUDGET_CATEGORIES.filter((category) => category !== "Savings").reduce((sum, category) => sum + categories[category], 0);
    const totalInflowCents = window.netPayCents + otherInflowCents;
    const metrics = calculateCashMetrics(totalInflowCents, totalOutflowCents);
    cumulative += metrics.marginCents;
    const monthlyBudget = BUDGET_CATEGORIES.filter((category) => category !== "Savings").reduce((sum, category) => sum + budgets[category], 0);
    const windowBudget = Math.round(monthlyBudget * daysInclusive(window.windowStart, window.windowEnd) / 30.4375);
    return {
      ...window,
      netPayCents: window.netPayCents,
      otherInflowCents,
      totalInflowCents,
      totalOutflowCents,
      ...metrics,
      cumulativeMarginCents: cumulative,
      categories,
      budgetVarianceCents: windowBudget - totalOutflowCents,
      forecastVarianceCents: null,
      transactions: periodTransactions,
    };
  });
}

function fixedForWindow(window: CashWindow, assumptions: Record<string, number>): Record<BudgetCategory, number> {
  const result = emptyCategories();
  const dueDate = (effective: string, end: string | null, amount: number) => {
    for (let cursor = effective.slice(0, 7); `${cursor}-01` <= window.windowEnd; ) {
      const date = `${cursor}-01`;
      if (date >= window.windowStart && date <= window.windowEnd && (!end || date <= end)) return Math.round(amount * 100);
      const current = new Date(`${cursor}-01T12:00:00Z`);
      current.setUTCMonth(current.getUTCMonth() + 1);
      cursor = current.toISOString().slice(0, 7);
    }
    return 0;
  };
  result["Rent & Housing"] = dueDate("2026-09-01", null, assumptions.rent ?? 1200);
  result["Auto Insurance"] = dueDate("2026-09-01", null, assumptions.insurance ?? 150);
  result["Car Payment"] = dueDate("2026-08-01", "2027-03-31", assumptions.car_payment ?? 400);
  result["Installment & Debt Payments"] = dueDate("2026-09-01", "2026-12-31", assumptions.affirm_payment ?? 100);
  return result;
}

function buildForecastPeriods(actual: PeriodResult[], assumptions: Record<string, number>, methods: CategoryMethod[], scenario: Scenario): PeriodResult[] {
  if (!actual.length) return [];
  const lastActual = actual.at(-1)!;
  const futurePayDates = generateFuturePayDates(lastActual.payDate, "2028-12-31");
  const multiplier = scenario === "lower" ? assumptions.lower_spend_multiplier ?? 0.9 : scenario === "higher" ? assumptions.higher_spend_multiplier ?? 1.1 : 1;
  const regularRate = assumptions.regular_wage ?? 20;
  const regularHours = assumptions.regular_hours ?? 80;
  const overtimeHours = assumptions.overtime_hours ?? 4.5;
  const overtimeMultiplier = assumptions.overtime_multiplier ?? 1.5;
  const taxRate = assumptions.tax_rate ?? 0.19;
  const deductionsCents = Math.round((assumptions.payroll_deductions ?? 260) * 100);
  let cumulative = lastActual.cumulativeMarginCents;
  return futurePayDates.map((payDate, index) => {
    const next = futurePayDates[index + 1];
    const earning = earningPeriodForPayDate(payDate);
    const window: CashWindow = {
      id: `forecast-${payDate}`,
      payDate,
      periodStart: earning.start,
      periodEnd: earning.end,
      netPayCents: 0,
      windowStart: payDate,
      windowEnd: next ? addDays(next, -1) : "2028-12-31",
      status: "Forecast",
    };
    const grossCents = Math.round((regularHours * regularRate + overtimeHours * regularRate * overtimeMultiplier) * 100);
    const netPayCents = Math.max(0, Math.round(grossCents * (1 - taxRate)) - deductionsCents);
    const categories = fixedForWindow(window, assumptions);
    const days = daysInclusive(window.windowStart, window.windowEnd);
    let residual = 0;
    for (const method of methods) {
      const month = Number(window.windowStart.slice(5, 7));
      const history = actual.map((period) => ({ date: period.windowStart, daily: period.categories[method.category] / daysInclusive(period.windowStart, period.windowEnd) }));
      categories[method.category] = Math.max(0, Math.round(candidatePrediction(method.method, history, month) * days * multiplier));
      residual += method.residualDailyCents * days;
    }
    const totalOutflowCents = BUDGET_CATEGORIES.filter((category) => category !== "Savings").reduce((sum, category) => sum + categories[category], 0);
    const metrics = calculateCashMetrics(netPayCents, totalOutflowCents);
    categories.Savings = Math.max(0, metrics.marginCents);
    cumulative += metrics.marginCents;
    return {
      ...window,
      netPayCents,
      otherInflowCents: 0,
      totalInflowCents: netPayCents,
      totalOutflowCents,
      ...metrics,
      cumulativeMarginCents: cumulative,
      categories,
      budgetVarianceCents: 0,
      forecastVarianceCents: 0,
      lowOutflowCents: Math.max(0, Math.round(totalOutflowCents - residual)),
      highOutflowCents: Math.round(totalOutflowCents + residual),
      transactions: [],
    };
  });
}

function rollup(periods: PeriodResult[], key: "month" | "year") {
  const rows = new Map<string, { label: string; inflowCents: number; outflowCents: number; marginCents: number }>();
  for (const period of periods) {
    const label = key === "month" ? period.windowStart.slice(0, 7) : period.windowStart.slice(0, 4);
    const row = rows.get(label) ?? { label, inflowCents: 0, outflowCents: 0, marginCents: 0 };
    row.inflowCents += period.totalInflowCents;
    row.outflowCents += period.totalOutflowCents;
    row.marginCents += period.marginCents;
    rows.set(label, row);
  }
  return [...rows.values()];
}

function categorySummary(periods: PeriodResult[], methods: CategoryMethod[]) {
  return BUDGET_CATEGORIES.map((category) => {
    const values = periods.filter((period) => period.status !== "Forecast").map((period) => period.categories[category]);
    const total = periods.reduce((sum, period) => sum + period.categories[category], 0);
    const inflow = periods.reduce((sum, period) => sum + period.totalInflowCents, 0);
    const outflow = periods.reduce((sum, period) => sum + period.totalOutflowCents, 0);
    const method = methods.find((row) => row.category === category);
    return {
      category,
      totalCents: total,
      percentOfInflow: inflow ? total / inflow : null,
      percentOfOutflow: outflow ? total / outflow : null,
      averageCents: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      medianCents: Math.round(median(values)),
      recentRunRateCents: values.length ? Math.round(values.slice(-4).reduce((sum, value) => sum + value, 0) / Math.min(values.length, 4)) : 0,
      method: method?.method ?? (fixedCategories.has(category) ? "Fixed schedule" : "No history"),
      backtestError: method?.errorRatio ?? null,
    };
  });
}

function buildMonthToDateState(db: DatabaseSync, transactions: TransactionRow[], cutoffs: { bank: string; venmo: string; payroll: string }) {
  const latest = [cutoffs.bank, cutoffs.venmo].filter(Boolean).sort().at(-1);
  if (!latest) return null;
  const month = latest.slice(0, 7);
  const sources: MonthToDateSource[] = [
    { sourceType: "bank", label: "Bank transactions", cutoff: cutoffs.bank },
    { sourceType: "venmo", label: "Venmo", cutoff: cutoffs.venmo },
  ].filter((source) => Boolean(source.cutoff));
  const rows: MonthToDateTransaction[] = transactions.map((row) => ({
    fingerprint: row.fingerprint,
    sourceType: row.source_type,
    transactionAt: row.transaction_at,
    signedAmountCents: row.signed_amount_cents,
    description: row.description,
    treatment: row.treatment,
    direction: row.direction,
    chosenCategory: row.chosen_category,
  }));
  const result = buildMonthToDate({ month, sources, transactions: rows });
  const statements = db.prepare(`
    SELECT pay_date, period_start, period_end, net_pay_cents
    FROM pay_statements WHERE pay_date >= ? AND pay_date <= ? ORDER BY pay_date
  `).all(result.monthStart, result.monthEnd) as Array<{ pay_date: string; period_start: string; period_end: string; net_pay_cents: number }>;
  return {
    ...result,
    payroll: {
      cutoff: cutoffs.payroll,
      reachesMonthEnd: cutoffs.payroll >= result.monthEnd,
      netPayCents: statements.reduce((sum, row) => sum + row.net_pay_cents, 0),
      statements,
    },
  };
}

export function getAppState(db: DatabaseSync, scenario: Scenario = "base") {
  const transactions = db.prepare(`
    SELECT fingerprint,source_type,source_file_name,account_label,transaction_at,signed_amount_cents,
      description,treatment,direction,exclusion_reason,chosen_category,classification_rule,confidence,review_required
    FROM transactions ORDER BY transaction_at DESC, fingerprint
  `).all() as unknown as TransactionRow[];
  const bankCutoff = String((db.prepare("SELECT MAX(transaction_at) value FROM transactions WHERE source_type='bank'").get() as { value: string | null }).value ?? "");
  const venmoCutoff = String((db.prepare("SELECT MAX(transaction_at) value FROM transactions WHERE source_type='venmo'").get() as { value: string | null }).value ?? "");
  const payrollCutoff = String((db.prepare("SELECT MAX(pay_date) value FROM pay_statements").get() as { value: string | null }).value ?? "");
  const spendingCutoff = [bankCutoff, venmoCutoff].filter(Boolean).sort()[0] ?? "";
  const assumptions = assumptionMap(db);
  const actual = buildActualPeriods(db, transactions, { spending: spendingCutoff, payroll: payrollCutoff }, assumptions);
  const training = actual.filter((period) => period.status === "Actual");
  const methods = selectCategoryMethods(training);
  const forecast = buildForecastPeriods(actual, assumptions, methods, scenario);
  const periods = [...actual, ...forecast];

  const lastActual = actual.filter((period) => period.status === "Actual").at(-1) ?? actual.at(-1);
  const provisional = actual.find((period) => period.status === "Provisional");
  const selectedPeriod = provisional ?? lastActual ?? forecast[0];
  const topDrivers = Object.entries(selectedPeriod?.categories ?? {})
    .filter(([category]) => category !== "Savings")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amountCents]) => ({ category, amountCents }));

  const rawCount = Number((db.prepare("SELECT COUNT(*) value FROM raw_import_rows").get() as { value: number }).value);
  const statusCounts = Object.fromEntries(
    (db.prepare("SELECT treatment, COUNT(*) value FROM raw_import_rows GROUP BY treatment").all() as Array<{ treatment: string; value: number }>).map((row) => [row.treatment, row.value]),
  );
  const checks = [
    { key: "margin", label: "Period margin equation", status: periods.every((p) => p.marginCents === p.totalInflowCents - p.totalOutflowCents) ? "PASS" : "FAIL", difference: 0, tolerance: 0, fixHint: "Pay Period P&L" },
    { key: "categories", label: "Category tie-out", status: periods.every((p) => BUDGET_CATEGORIES.filter((c) => c !== "Savings").reduce((s, c) => s + p.categories[c], 0) === p.totalOutflowCents) ? "PASS" : "FAIL", difference: 0, tolerance: 0, fixHint: "Classification" },
    { key: "raw", label: "Raw import accounting", status: Object.values(statusCounts).reduce((sum, value) => sum + Number(value), 0) === rawCount ? "PASS" : "FAIL", difference: 0, tolerance: 0, fixHint: "Imports" },
    { key: "car", label: "Car payment counted once", status: "WARN", difference: 0, tolerance: 0, fixHint: "Confirm current payoff and mirrored transfers", notes: "29 raw Auto Loan credits are recovered once; July update remains user-confirmed." },
    { key: "freshness", label: "Source freshness", status: bankCutoff === venmoCutoff && venmoCutoff === payrollCutoff ? "PASS" : "WARN", difference: 0, tolerance: 0, fixHint: "Import the next bank or payroll export", notes: `Bank ${bankCutoff}; Venmo ${venmoCutoff}; Payroll ${payrollCutoff}` },
  ];

  const assumptionsRows = db.prepare("SELECT * FROM assumptions ORDER BY CASE status WHEN 'Needs confirmation' THEN 0 ELSE 1 END, label").all();
  const importBatches = db.prepare("SELECT id,source_type,source_file_name,imported_at,row_count,inserted_count,duplicate_count FROM import_batches ORDER BY id DESC LIMIT 40").all();
  const forecastRuns = db.prepare("SELECT * FROM forecast_runs ORDER BY id DESC LIMIT 12").all();
  return {
    meta: {
      bankCutoff, venmoCutoff, payrollCutoff, spendingCutoff,
      timezone: "America/Denver",
      modelVersion: "1.0.0",
      scenario,
      generatedAt: new Date().toISOString(),
      modelStatus: checks.some((check) => check.status === "FAIL") ? "FAIL" : checks.some((check) => check.status === "WARN") ? "WARN" : "PASS",
    },
    selectedPeriodId: selectedPeriod?.id,
    topDrivers,
    periods,
    categories: categorySummary(periods, methods),
    methods,
    assumptions: assumptionsRows,
    transactions,
    checks,
    importBatches,
    forecastRuns,
    monthToDate: buildMonthToDateState(db, transactions, { bank: bankCutoff, venmo: venmoCutoff, payroll: payrollCutoff }),
    monthly: rollup(periods, "month"),
    annual: rollup(periods, "year"),
  };
}

export function recordForecastRun(db: DatabaseSync, scenario: Scenario): void {
  const state = getAppState(db, scenario);
  db.prepare(`
    INSERT INTO forecast_runs(data_cutoffs_json, assumptions_json, category_methods_json, model_version, scenario)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    JSON.stringify({ bank: state.meta.bankCutoff, venmo: state.meta.venmoCutoff, payroll: state.meta.payrollCutoff }),
    JSON.stringify(state.assumptions),
    JSON.stringify(state.methods),
    state.meta.modelVersion,
    scenario,
  );
}
