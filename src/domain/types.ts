export const SPENDING_CATEGORIES = [
  "Rent & Housing",
  "Car Payment",
  "Auto Insurance",
  "Fuel",
  "Vehicle Maintenance & Registration",
  "Installment & Debt Payments",
  "Restaurants & Fast Food",
  "Groceries",
  "General Retail & Household",
  "Electronics & Tech",
  "Tabletop Games & Miniatures",
  "Video Games & Game Services",
  "Movies, Events & Recreation",
  "Streaming, Music & Audiobooks",
  "AI, Software & Web Services",
  "Adult Content & Products",
  "Vape & Nicotine",
  "Cannabis & Medicinal Products",
  "Alcohol & Bars",
  "Pet Care & Aquatics",
  "Healthcare & Pharmacy",
  "Home & Garage",
  "Personal Care",
  "Gifts & Personal Support",
  "Travel & Camping",
  "Taxes & Government",
  "Banking Fees",
  "Cash Withdrawals",
  "Needs Review",
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

export const BUDGET_CATEGORIES = [...SPENDING_CATEGORIES, "Savings"] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
export type ClassificationCategory = SpendingCategory;
export type PeriodStatus = "Actual" | "Provisional" | "Forecast";

export interface CashMetrics {
  inflowCents: number;
  outflowCents: number;
  marginCents: number;
  outflowRatio: number | null;
  marginRatio: number | null;
}

export interface PayStatement {
  id: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  netPayCents: number;
}

export interface CashWindow extends PayStatement {
  windowStart: string;
  windowEnd: string;
  status: PeriodStatus;
}

export interface NormalizedTransaction {
  sourceType: "bank" | "venmo" | "payroll";
  account: string;
  transactionAt: string;
  signedAmountCents: number;
  description: string;
  externalId?: string;
  originalCategory?: string;
  originalParentCategory?: string;
  transactionType?: string;
}
