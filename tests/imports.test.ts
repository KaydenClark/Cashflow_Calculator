import { describe, expect, it } from "vitest";
import { classifyBankTreatment, classifyVenmoTreatment, transactionFingerprint } from "../src/domain/imports.js";
import { previewCsv } from "../src/server/importers.js";
import type { NormalizedTransaction } from "../src/domain/types.js";

const base: NormalizedTransaction = {
  sourceType: "bank",
  account: "Premium Checking",
  transactionAt: "2026-08-20T12:00:00",
  signedAmountCents: -4500,
  description: "  Corner  Store ",
};

describe("import normalization", () => {
  it("creates a stable normalized fingerprint", () => {
    expect(transactionFingerprint(base)).toBe(transactionFingerprint({ ...base, description: "corner store" }));
    expect(transactionFingerprint(base)).not.toBe(transactionFingerprint({ ...base, signedAmountCents: -4501 }));
  });

  it.each([
    { description: "DAILYPAY deposit", originalParentCategory: "Income" },
    { description: "Transfer to savings", originalParentCategory: "Transfer" },
    { description: "Paycheck deposit", transactionType: "Credit", originalCategory: "Paycheck" },
    { description: "Robinhood buy", account: "Robinhood individual" },
    { description: "Optum Bank HSA Contribution", originalParentCategory: "Health & Fitness" },
  ])("excludes internal or duplicated cash movement: $description", (patch) => {
    expect(classifyBankTreatment({ ...base, ...patch })).toBe("excluded");
  });

  it("recovers Auto Loan credits as expenses exactly once", () => {
    expect(classifyBankTreatment({ ...base, account: "Auto Loan 1", transactionType: "Credit", originalParentCategory: "Transfer" })).toBe("included");
    expect(classifyBankTreatment({ ...base, account: "Premium Checking", description: "Transfer to Auto Loan", originalParentCategory: "Transfer" })).toBe("excluded");
  });

  it("handles Venmo purchases, transfers, receipts, and ambiguous P2P", () => {
    expect(classifyVenmoTreatment({ ...base, sourceType: "venmo", transactionType: "Venmo Card Transaction" })).toBe("expense");
    expect(classifyVenmoTreatment({ ...base, sourceType: "venmo", transactionType: "Instant Add Funds" })).toBe("excluded");
    expect(classifyVenmoTreatment({ ...base, sourceType: "venmo", transactionType: "Payment", signedAmountCents: 5000 })).toBe("income");
    expect(classifyVenmoTreatment({ ...base, sourceType: "venmo", transactionType: "Payment", signedAmountCents: -5000 })).toBe("expense");
  });

  it("excludes Venmo card deposits into an investment account", () => {
    expect(classifyVenmoTreatment({
      ...base,
      sourceType: "venmo",
      transactionType: "Venmo Card Transaction",
      description: "Venmo Card Transaction: RH BROKERAGE DEPOSIT",
    })).toBe("excluded");
  });

  it("keeps P2P outflows negative and identifies the other person", () => {
    const csv = [
      "ID,Datetime,Type,Status,Note,From,To,Amount (total),Funding Source,Destination,Terminal Location",
      '123,2026-08-01 03:58:01,Payment,Complete,Camping supplies,Example Owner,Example Recipient,- $60.00,,,Venmo',
    ].join("\n");

    expect(previewCsv("venmo", "2026.08.csv", csv)[0]).toMatchObject({
      description: "Payment: Example Recipient (Camping supplies)",
      signedAmountCents: -6000,
      treatment: "included",
      direction: "expense",
    });
  });

  it("identifies the sender on incoming P2P payments", () => {
    const csv = [
      "ID,Datetime,Type,Status,Note,From,To,Amount (total),Funding Source,Destination,Terminal Location",
      '124,2026-08-01 03:24:24,Payment,Complete,Tent,Example Sender,Example Owner,+ $60.00,,Venmo balance,Venmo',
    ].join("\n");

    expect(previewCsv("venmo", "2026.08.csv", csv)[0]?.description).toBe("Payment: Example Sender (Tent)");
  });

  it("preserves four-digit years in newer bank exports", () => {
    const csv = [
      "Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification",
      '"*0000",7/31/2026,,Amazon,79.49,,Posted,283.53,SHOPPING',
    ].join("\n");

    expect(previewCsv("bank", "2026.07.csv", csv)[0]?.transactionAt).toBe("2026-07-31");
  });

  it("parses four-digit years in the newer bank export format", () => {
    const [row] = previewCsv(
      "bank",
      "new-format.csv",
      "Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification\n*0000,7/31/2026,,Coffee,4.25,,Posted,100.00,FAST_FOOD\n",
    );
    expect(row.transactionAt).toBe("2026-07-31");
  });
});
