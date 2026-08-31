import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import {
  createDatabase,
  getTransaction,
  importTransactions,
  migrateDatabase,
  setClassificationOverride,
  type StoredTransaction,
} from "../src/server/database.js";
import { getAppState } from "../src/server/analytics.js";

let db: DatabaseSync | undefined;
afterEach(() => db?.close());

const row: StoredTransaction = {
  sourceType: "bank",
  account: "Checking",
  transactionAt: "2026-08-20",
  signedAmountCents: -12642,
  description: "Kroger",
  fingerprint: "tx-1",
  treatment: "included",
  direction: "expense",
  chosenCategory: "Groceries",
  classificationRule: "exact:kroger",
  confidence: 0.98,
  review: false,
  rawJson: "{}",
  sourceFileName: "bank.csv",
  rowNumber: 2,
};

describe("durable import storage", () => {
  it("returns an empty application state before an account imports data", () => {
    db = createDatabase(":memory:");
    migrateDatabase(db);

    expect(getAppState(db)).toMatchObject({
      periods: [],
      transactions: [],
      monthToDate: null,
    });
  });

  it("deduplicates a repeated import without duplicating results", () => {
    db = createDatabase(":memory:");
    migrateDatabase(db);
    expect(importTransactions(db, "bank", "bank.csv", [row])).toEqual({ inserted: 1, duplicates: 0 });
    expect(importTransactions(db, "bank", "bank.csv", [row])).toEqual({ inserted: 0, duplicates: 1 });
  });

  it("preserves a user category override during re-import", () => {
    db = createDatabase(":memory:");
    migrateDatabase(db);
    importTransactions(db, "bank", "bank.csv", [row]);
    setClassificationOverride(db, row.fingerprint, "Pet Care & Aquatics", "Pet supplies");
    importTransactions(db, "bank", "bank.csv", [{ ...row, chosenCategory: "General Retail & Household", classificationRule: "source:Shopping" }]);
    expect(getTransaction(db, row.fingerprint)).toMatchObject({ chosen_category: "Pet Care & Aquatics", classification_rule: "user_override" });
  });

  it("replaces an older normalization of the same external transaction", () => {
    db = createDatabase(":memory:");
    migrateDatabase(db);
    const oldRow: StoredTransaction = {
      ...row,
      sourceType: "venmo",
      externalId: "venmo-123",
      fingerprint: "old-fingerprint",
      description: "Payment: Example Owner (Tent)",
      signedAmountCents: 6000,
      direction: "income",
      chosenCategory: "Needs Review",
    };
    const correctedRow: StoredTransaction = {
      ...oldRow,
      fingerprint: "corrected-fingerprint",
      description: "Payment: Example Sender (Tent)",
      signedAmountCents: -6000,
      direction: "expense",
      chosenCategory: "Travel & Camping",
    };

    importTransactions(db, "venmo", "old.csv", [oldRow]);
    importTransactions(db, "venmo", "corrected.csv", [correctedRow]);

    expect(db.prepare("SELECT COUNT(*) AS count FROM transactions").get()).toMatchObject({ count: 1 });
    expect(getTransaction(db, correctedRow.fingerprint)).toMatchObject({
      description: "Payment: Example Sender (Tent)",
      signed_amount_cents: -6000,
      chosen_category: "Travel & Camping",
    });
  });

  it("refreshes normalized fields when the fingerprint is unchanged", () => {
    db = createDatabase(":memory:");
    migrateDatabase(db);
    const oldRow: StoredTransaction = {
      ...row,
      sourceType: "venmo",
      externalId: "venmo-456",
      fingerprint: "stable-fingerprint",
      signedAmountCents: 50000,
      direction: "unresolved",
      treatment: "unresolved",
      chosenCategory: "Needs Review",
    };
    const correctedRow: StoredTransaction = {
      ...oldRow,
      signedAmountCents: -50000,
      direction: "expense",
      treatment: "included",
      chosenCategory: "Rent & Housing",
    };

    importTransactions(db, "venmo", "old.csv", [oldRow]);
    importTransactions(db, "venmo", "corrected.csv", [correctedRow]);

    expect(getTransaction(db, correctedRow.fingerprint)).toMatchObject({
      signed_amount_cents: -50000,
      direction: "expense",
      treatment: "included",
      chosen_category: "Rent & Housing",
    });
  });
});
