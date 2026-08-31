import { createHash } from "node:crypto";
import type { NormalizedTransaction } from "./types.js";

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function transactionFingerprint(_transaction: NormalizedTransaction): string {
  const parts = [
    _transaction.sourceType,
    normalizeText(_transaction.account),
    _transaction.transactionAt.trim(),
    String(_transaction.signedAmountCents),
    normalizeText(_transaction.description),
    normalizeText(_transaction.externalId),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function classifyBankTreatment(_transaction: NormalizedTransaction): "included" | "excluded" | "unresolved" {
  const description = normalizeText(_transaction.description);
  const account = normalizeText(_transaction.account);
  const category = normalizeText(_transaction.originalCategory);
  const parent = normalizeText(_transaction.originalParentCategory);
  const type = normalizeText(_transaction.transactionType);

  if (account.includes("auto loan") && type === "credit") return "included";
  if (description.includes("dailypay")) return "excluded";
  if (description.includes("hsa contribution")) return "excluded";
  if (description.includes("transfer to savings") || description.includes("transfer from savings")) return "excluded";
  if (account.includes("robinhood") || account.includes("crypto")) return "excluded";
  if (category === "paycheck" && type === "credit") return "excluded";
  if (parent === "transfer" || category === "transfer") return "excluded";
  if (description.includes("venmo") && description.includes("transfer")) return "excluded";
  return "included";
}

export function classifyVenmoTreatment(_transaction: NormalizedTransaction): "expense" | "income" | "excluded" | "unresolved" {
  const type = normalizeText(_transaction.transactionType);
  const description = normalizeText(_transaction.description);
  if (type === "instant add funds" || type === "instant transfer" || type === "direct deposit") return "excluded";
  if (description.includes("instant add funds") || description.includes("instant transfer")) return "excluded";
  if (description.includes("robinhood") || description.includes("rh brokerage")) return "excluded";
  if (type === "venmo card transaction" || type === "merchant transaction") return "expense";
  if ((type === "payment" || type === "charge") && _transaction.signedAmountCents > 0) return "income";
  if ((type === "payment" || type === "charge") && _transaction.signedAmountCents < 0) return "expense";
  return "unresolved";
}
