import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { DatabaseSync } from "node:sqlite";
import { classifyTransaction, type ClassificationRuleSet } from "../domain/classification.js";
import { classifyBankTreatment, classifyVenmoTreatment, transactionFingerprint } from "../domain/imports.js";
import type { NormalizedTransaction, SpendingCategory } from "../domain/types.js";
import { importTransactions, type StoredTransaction } from "./database.js";

const exactMerchants: Record<string, SpendingCategory> = {
  amazon: "General Retail & Household",
  walmart: "General Retail & Household",
  costco: "General Retail & Household",
  "smith's": "Groceries",
  kroger: "Groceries",
  aldi: "Groceries",
  winco: "Groceries",
  harmons: "Groceries",
  netflix: "Streaming, Music & Audiobooks",
  spotify: "Streaming, Music & Audiobooks",
  audible: "Streaming, Music & Audiobooks",
  openai: "AI, Software & Web Services",
  anthropic: "AI, Software & Web Services",
  "anthropic.com": "AI, Software & Web Services",
  "hobby lobby": "General Retail & Household",
  petco: "Pet Care & Aquatics",
  petsmart: "Pet Care & Aquatics",
  "honda finance": "Car Payment",
};

const sourceMappings: Record<string, SpendingCategory> = {
  Rent: "Rent & Housing",
  "Mortgage & Rent": "Rent & Housing",
  Groceries: "Groceries",
  Restaurants: "Restaurants & Fast Food",
  "Fast Food": "Restaurants & Fast Food",
  "Food & Dining": "Restaurants & Fast Food",
  Gas: "Fuel",
  Pharmacy: "Healthcare & Pharmacy",
  Percriptions: "Healthcare & Pharmacy",
  Prescriptions: "Healthcare & Pharmacy",
  Doctor: "Healthcare & Pharmacy",
  "Health & Medical": "Healthcare & Pharmacy",
  "Health Insurance": "Healthcare & Pharmacy",
  Pets: "Pet Care & Aquatics",
  "Pet Food & Supplies": "Pet Care & Aquatics",
  Shopping: "General Retail & Household",
  Clothing: "General Retail & Household",
  "Electronics & Software": "Electronics & Tech",
  Entertainment: "Movies, Events & Recreation",
  Amusement: "Movies, Events & Recreation",
  "Movies & DVDs": "Movies, Events & Recreation",
  Hobbies: "Tabletop Games & Miniatures",
  Subscriptions: "Streaming, Music & Audiobooks",
  Music: "Streaming, Music & Audiobooks",
  Books: "Streaming, Music & Audiobooks",
  Television: "Streaming, Music & Audiobooks",
  Internet: "AI, Software & Web Services",
  "Business Services": "AI, Software & Web Services",
  FAST_FOOD: "Restaurants & Fast Food",
  RESTAURANTS: "Restaurants & Fast Food",
  GROCERIES: "Groceries",
  SHOPPING: "General Retail & Household",
  GAS_FUEL: "Fuel",
  MEDICAL: "Healthcare & Pharmacy",
  PHARMACY: "Healthcare & Pharmacy",
  Debts: "Installment & Debt Payments",
  Financial: "Installment & Debt Payments",
  AI: "AI, Software & Web Services",
  ALCOHOL_BARS: "Alcohol & Bars",
  "Alcohol & Bars": "Alcohol & Bars",
  AUTO_PAYMENT: "Car Payment",
  "Auto & Transport": "Vehicle Maintenance & Registration",
  "Service & Parts": "Vehicle Maintenance & Registration",
  Parking: "Vehicle Maintenance & Registration",
  "Banking Fee": "Banking Fees",
  "ATM Fee": "Banking Fees",
  BANKING_FEE: "Banking Fees",
  "Federal Tax": "Taxes & Government",
  "State Tax": "Taxes & Government",
  "Home Improvement": "Home & Garage",
  Furnishings: "Home & Garage",
  Cash: "Cash Withdrawals",
  Uncategorized: "Needs Review",
};

export const DEFAULT_CLASSIFICATION_RULES: ClassificationRuleSet = {
  exact: exactMerchants,
  keywords: [
    { pattern: /\b(rent|apartment|housing)\b|🏠/i, category: "Rent & Housing" },
    { pattern: /\b(honda finance|auto loan|car payment)\b/i, category: "Car Payment" },
    { pattern: /\b(progressive|geico|auto insurance|car insurance)\b|🚗\s*insurance/i, category: "Auto Insurance" },
    { pattern: /\baffirm\b/i, category: "Installment & Debt Payments" },
    { pattern: /\b(adult content|adult wellness)\b/i, category: "Adult Content & Products" },
    { pattern: /\b(cannabis|dispensary)\b/i, category: "Cannabis & Medicinal Products" },
    { pattern: /\b(vape|nicotine)\b/i, category: "Vape & Nicotine" },
    { pattern: /\b(spay\s*&?\s*neuter|petco|petsmart|fish food|pet food|vet|veterinary|harness)\b/i, category: "Pet Care & Aquatics" },
    { pattern: /\b(doctor|clinic|pharmacy|prescription|meds)\b/i, category: "Healthcare & Pharmacy" },
    { pattern: /\b(shell|chevron|exxon|gas station|fuel|maverik|7-eleven)\b|⛽/i, category: "Fuel" },
    { pattern: /\b(jiffy lube|safelite|autozone|utah[- ]?dmv|dmv|parking lot|auto repair|service & parts)\b/i, category: "Vehicle Maintenance & Registration" },
    { pattern: /\b(kroger|smith'?s|aldi|winco|grocery|whole foods|ingredients for eggs|eggs?|foobs)\b/i, category: "Groceries" },
    { pattern: /\b(warhammer|magic cards?|catan|dnd|mini(?:ature|fig)|tabletop game)\b/i, category: "Tabletop Games & Miniatures" },
    { pattern: /\b(steam(?:games)?|nintendo|gamestop|minecraft|video game)\b/i, category: "Video Games & Game Services" },
    { pattern: /\b(spotify(?:ab)?|hbo|max stream|youtube(?:\s*premium)?|youtube red|disneyplus|disney plus|hulu|audible|prime video|google\s*\*?\s*tv|patreon)\b/i, category: "Streaming, Music & Audiobooks" },
    { pattern: /\b(openai|chatgpt|anthropic|claude|nordvpn|nordproducts|truthfinder|google one|github|adobe cloud|discord|paddle\.net)\b/i, category: "AI, Software & Web Services" },
    { pattern: /\b(cinemark|tix\.com|nickelmania|rush funplex|living planet aquarium|movie|movies|amusement)\b|🍿|🎥/i, category: "Movies, Events & Recreation" },
    { pattern: /\b(liquor store|alcohol|bar & grill|pub)\b/i, category: "Alcohol & Bars" },
    { pattern: /\b(restaurant|fast food|pizza|burger|chicken|fries|snack|shake|ice cream|coffee|doordash)\b|🍕|🍔|🌮|🍦/i, category: "Restaurants & Fast Food" },
    { pattern: /\b(best buy|electronics|printer)\b/i, category: "Electronics & Tech" },
    { pattern: /\b(hardware|home improvement|furnishings|garage)\b/i, category: "Home & Garage" },
    { pattern: /\b(spa day|salon|personal care)\b/i, category: "Personal Care" },
    { pattern: /\b(gift|present|appreciation|birthday)\b|🎁/i, category: "Gifts & Personal Support" },
    { pattern: /\b(vacation|camping|tent)\b/i, category: "Travel & Camping" },
    { pattern: /\b(irs tax|freetaxusa|federal tax|state tax)\b/i, category: "Taxes & Government" },
    { pattern: /\b(monthly fee|atm transaction fee|banking fee)\b/i, category: "Banking Fees" },
    { pattern: /\batm withdrawal\b/i, category: "Cash Withdrawals" },
    { pattern: /\b(amazon|walmart|wal-mart|wm supercenter|costco|etsy)\b/i, category: "General Retail & Household" },
  ],
  source: sourceMappings,
};

function parseMoneyToCents(value: unknown): number {
  const normalized = String(value ?? "").replace(/[$,\s]/g, "").replace(/[()]/g, "").trim();
  if (!normalized) return 0;
  const negative = String(value).includes("(") || normalized.startsWith("-");
  const amount = Math.round(Math.abs(Number(normalized)) * 100);
  if (!Number.isFinite(amount)) throw new Error(`Invalid money value: ${String(value)}`);
  return negative ? -amount : amount;
}

function isoDate(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?:\D|$)/);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    return `${year}-${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed.toISOString().slice(0, 10);
}

function safeAccountLabel(account: string): string {
  if (/^\*?\d+$/.test(account.trim())) return "Primary bank";
  return account.replace(/\s*\*\d{2,}\s*$/, "").trim() || "Unknown account";
}

function merchantFromDescription(description: string): string {
  return description.replace(/^Venmo Card:\s*/i, "").split(/[-|]/)[0].trim();
}

function excludedReason(transaction: NormalizedTransaction): string | undefined {
  const blob = `${transaction.description} ${transaction.account}`.toLowerCase();
  if (blob.includes("dailypay")) return "DailyPay advance already represented in payroll";
  if (blob.includes("hsa contribution")) return "Health savings account contribution";
  if (blob.includes("robinhood") || blob.includes("crypto")) return "Investment principal movement";
  if (transaction.originalCategory?.toLowerCase() === "paycheck") return "Duplicated payroll deposit";
  if (transaction.originalParentCategory?.toLowerCase() === "transfer" || transaction.originalCategory?.toLowerCase() === "transfer") {
    return "Internal transfer or savings movement";
  }
  return undefined;
}

function venmoExcludedReason(transaction: NormalizedTransaction): string {
  const description = transaction.description.toLowerCase();
  if (description.includes("robinhood") || description.includes("rh brokerage")) {
    return "Investment principal movement";
  }
  if (transaction.transactionType?.toLowerCase() === "direct deposit") {
    return "Direct deposit handled outside transaction spending";
  }
  return "Venmo internal funding or transfer movement";
}

function normalizeBankRow(raw: Record<string, string>, fileName: string, rowNumber: number): StoredTransaction {
  const accountRaw = raw.Account || raw["Account Number"] || "Unknown account";
  const type = (raw.Type || (raw.Debit ? "Debit" : "Credit")).trim();
  const amount = Math.abs(parseMoneyToCents(raw.Amount || raw.Debit || raw.Credit));
  const isAutoLoanCredit = /auto loan/i.test(accountRaw) && /^credit$/i.test(type);
  const signedAmountCents = isAutoLoanCredit || /^debit$/i.test(type) ? -amount : amount;
  const description = (raw.Description || raw["Original Description"] || "Unknown transaction").trim();
  const transaction: NormalizedTransaction = {
    sourceType: "bank",
    account: safeAccountLabel(accountRaw),
    transactionAt: isoDate(raw.Date || raw["Post Date"]),
    signedAmountCents,
    description,
    originalCategory: (raw.Category || raw.Classification)?.trim(),
    originalParentCategory: (raw["Parent Category"] || raw.Classification)?.trim(),
    transactionType: type,
  };
  const treatment = classifyBankTreatment({ ...transaction, account: accountRaw });
  const classification = isAutoLoanCredit
    ? { category: "Car Payment" as const, rule: "account:auto_loan_credit", confidence: 1, review: false }
    : classifyTransaction(
        {
          description,
          merchant: merchantFromDescription(description),
          originalCategory: transaction.originalCategory || transaction.originalParentCategory,
        },
        DEFAULT_CLASSIFICATION_RULES,
      );
  const exclusionReason = treatment === "excluded" ? excludedReason({ ...transaction, account: accountRaw }) ?? "Excluded cash movement" : undefined;
  let direction: StoredTransaction["direction"];
  if (treatment === "excluded") direction = "excluded";
  else if (isAutoLoanCredit || signedAmountCents < 0) direction = "expense";
  else if (!/income|dividend|refund/i.test(`${raw["Parent Category"] ?? ""} ${raw.Category ?? ""} ${raw.Classification ?? ""} ${description}`)) direction = "refund";
  else direction = "income";
  const fingerprint = transactionFingerprint(transaction);
  return {
    ...transaction,
    fingerprint,
    treatment,
    direction,
    chosenCategory: classification.category,
    classificationRule: classification.rule,
    confidence: classification.confidence,
    review: treatment !== "excluded" && (treatment === "unresolved" || classification.review),
    exclusionReason,
    rawJson: JSON.stringify(raw),
    sourceFileName: fileName,
    rowNumber,
  };
}

function normalizeVenmoRow(raw: Record<string, string>, fileName: string, rowNumber: number): StoredTransaction {
  const type = (raw.Type ?? "").trim();
  const amount = parseMoneyToCents(raw["Amount (total)"]);
  const from = raw.From?.trim() ?? "";
  const to = raw.To?.trim() ?? "";
  const owner = process.env.CASHFLOW_OWNER_NAME?.trim().toLowerCase();
  const merchant = (
    owner && from.toLowerCase() === owner ? to
      : owner && to.toLowerCase() === owner ? from
        : amount < 0 ? to || from
          : from || to
  ) || raw["Funding Source"] || "Venmo contact";
  const note = raw.Note?.trim();
  const description = `${type}: ${merchant}${note ? ` (${note})` : ""}`;
  const transaction: NormalizedTransaction = {
    sourceType: "venmo",
    account: "Venmo",
    transactionAt: isoDate(raw.Datetime),
    signedAmountCents: amount,
    description,
    externalId: raw.ID?.trim() || undefined,
    originalCategory: type,
    originalParentCategory: "Venmo",
    transactionType: type,
  };
  const venmoTreatment = classifyVenmoTreatment(transaction);
  const treatment = venmoTreatment === "expense" || venmoTreatment === "income" ? "included" : venmoTreatment;
  const classification = classifyTransaction({ description, merchant }, DEFAULT_CLASSIFICATION_RULES);
  const direction: StoredTransaction["direction"] =
    treatment === "excluded" ? "excluded" : treatment === "unresolved" ? "unresolved" : venmoTreatment;
  const chosenCategory = classification.category;
  const fingerprint = transactionFingerprint(transaction);
  return {
    ...transaction,
    signedAmountCents: direction === "expense" ? -Math.abs(amount) : direction === "income" ? Math.abs(amount) : amount,
    fingerprint,
    treatment,
    direction,
    chosenCategory,
    classificationRule: classification.rule,
    confidence: classification.confidence,
    review: treatment !== "excluded" && (treatment === "unresolved" || classification.review),
    exclusionReason: treatment === "excluded" ? venmoExcludedReason(transaction) : undefined,
    rawJson: JSON.stringify(raw),
    sourceFileName: fileName,
    rowNumber,
  };
}

function parseCsvRecords(text: string): Record<string, string>[] {
  return parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true });
}

function parseVenmoRecords(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes("ID") && line.includes("Datetime") && line.includes("Amount (total)"));
  if (headerIndex < 0) throw new Error("Venmo CSV header was not found");
  const records = parseCsvRecords(lines.slice(headerIndex).join("\n"));
  return records.map((record) => {
    if (record.ID !== undefined) return record;
    const shifted = { ...record };
    for (const [key, value] of Object.entries(record)) {
      if (key.trim() === "") continue;
      shifted[key.trim()] = value;
    }
    return shifted;
  });
}

export function previewCsv(sourceType: "bank" | "venmo", fileName: string, text: string): StoredTransaction[] {
  const records = sourceType === "venmo" ? parseVenmoRecords(text) : parseCsvRecords(text);
  return records
    .filter((row) => (sourceType === "venmo" ? /complete/i.test(row.Status ?? "Complete") : true))
    .map((row, index) =>
      sourceType === "venmo"
        ? normalizeVenmoRow(row, fileName, index + 2)
        : normalizeBankRow(row, fileName, index + 2),
    );
}

export function importSourceCsv(db: DatabaseSync, sourceType: "bank" | "venmo", filePath: string) {
  const fileName = path.basename(filePath);
  const rows = previewCsv(sourceType, fileName, fs.readFileSync(filePath, "utf8"));
  return { ...importTransactions(db, sourceType, fileName, rows), rows: rows.length };
}

export function importCsvText(db: DatabaseSync, sourceType: "bank" | "venmo", fileName: string, text: string) {
  const rows = previewCsv(sourceType, fileName, text);
  return { ...importTransactions(db, sourceType, fileName, rows), rows: rows.length };
}
