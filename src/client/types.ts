export type Scenario = "base" | "lower" | "higher";
export type Status = "Actual" | "Provisional" | "Forecast";

export interface Transaction {
  fingerprint: string;
  source_type: string;
  source_file_name: string;
  account_label: string;
  transaction_at: string;
  signed_amount_cents: number;
  description: string;
  treatment: "included" | "excluded" | "unresolved";
  direction: string;
  exclusion_reason: string | null;
  chosen_category: string;
  classification_rule: string;
  confidence: number;
  review_required: number;
}

export interface Period {
  id: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  windowStart: string;
  windowEnd: string;
  status: Status;
  netPayCents: number;
  otherInflowCents: number;
  totalInflowCents: number;
  totalOutflowCents: number;
  marginCents: number;
  outflowRatio: number | null;
  marginRatio: number | null;
  cumulativeMarginCents: number;
  categories: Record<string, number>;
  budgetVarianceCents: number;
  forecastVarianceCents: number | null;
  lowOutflowCents?: number;
  highOutflowCents?: number;
  transactions: Transaction[];
}

export interface CategorySummary {
  category: string;
  totalCents: number;
  percentOfInflow: number | null;
  percentOfOutflow: number | null;
  averageCents: number;
  medianCents: number;
  recentRunRateCents: number;
  method: string;
  backtestError: number | null;
}

export interface Assumption {
  assumption_key: string;
  label: string;
  value_number: number;
  unit: string;
  effective_date: string | null;
  source: string;
  status: string;
  notes: string;
  updated_at: string;
}

export interface MonthToDate {
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
  categories: Array<{ category: string; amountCents: number; shareOfOutflow: number | null }>;
  daily: Array<{ date: string; day: number; inflowCents: number; outflowCents: number; marginCents: number; cumulativeMarginCents: number }>;
  coverage: Array<{ sourceType: string; label: string; cutoff: string; reachesAsOf: boolean; lastInMonth: string | null; includedRowCount: number; missingDays: number }>;
  confidence: "complete" | "partial" | "none";
  pace: Array<{ month: string; outflowToDayCents: number; fullMonthOutflowCents: number }>;
  paceDeltaCents: number | null;
  transactions: Array<{ fingerprint: string; sourceType: string; transactionAt: string; signedAmountCents: number; description: string; direction: string; chosenCategory: string }>;
  payroll: {
    cutoff: string;
    reachesMonthEnd: boolean;
    netPayCents: number;
    statements: Array<{ pay_date: string; period_start: string; period_end: string; net_pay_cents: number }>;
  };
}

export interface AppState {
  meta: {
    bankCutoff: string;
    venmoCutoff: string;
    payrollCutoff: string;
    spendingCutoff: string;
    timezone: string;
    modelVersion: string;
    scenario: Scenario;
    generatedAt: string;
    modelStatus: "PASS" | "WARN" | "FAIL";
  };
  selectedPeriodId?: string;
  topDrivers: Array<{ category: string; amountCents: number }>;
  periods: Period[];
  categories: CategorySummary[];
  methods: Array<{ category: string; method: string; errorRatio: number; dailyBaselineCents: number; residualDailyCents: number }>;
  assumptions: Assumption[];
  transactions: Transaction[];
  checks: Array<{ key: string; label: string; status: string; difference: number; tolerance: number; fixHint: string; notes?: string }>;
  importBatches: Array<Record<string, string | number>>;
  forecastRuns: Array<Record<string, string | number>>;
  monthToDate: MonthToDate | null;
  monthly: Array<{ label: string; inflowCents: number; outflowCents: number; marginCents: number }>;
  annual: Array<{ label: string; inflowCents: number; outflowCents: number; marginCents: number }>;
}

export const SPENDING_CATEGORIES = [
  "Rent & Housing", "Car Payment", "Auto Insurance", "Fuel", "Vehicle Maintenance & Registration",
  "Installment & Debt Payments", "Restaurants & Fast Food", "Groceries", "General Retail & Household",
  "Electronics & Tech", "Tabletop Games & Miniatures", "Video Games & Game Services",
  "Movies, Events & Recreation", "Streaming, Music & Audiobooks", "AI, Software & Web Services",
  "Adult Content & Products", "Vape & Nicotine", "Cannabis & Medicinal Products", "Alcohol & Bars",
  "Pet Care & Aquatics", "Healthcare & Pharmacy", "Home & Garage", "Personal Care",
  "Gifts & Personal Support", "Travel & Camping", "Taxes & Government", "Banking Fees",
  "Cash Withdrawals", "Needs Review",
];
