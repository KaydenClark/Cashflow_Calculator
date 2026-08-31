import { DatabaseSync } from "node:sqlite";
import type { NormalizedTransaction, SpendingCategory } from "../domain/types.js";

export interface StoredTransaction extends NormalizedTransaction {
  fingerprint: string;
  treatment: "included" | "excluded" | "unresolved";
  direction: "expense" | "income" | "refund" | "excluded" | "unresolved";
  chosenCategory: SpendingCategory;
  classificationRule: string;
  confidence: number;
  review: boolean;
  exclusionReason?: string;
  rawJson: string;
  sourceFileName: string;
  rowNumber: number;
}

export function createDatabase(_path: string): DatabaseSync {
  const db = new DatabaseSync(_path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return db;
}

export function migrateDatabase(_db: DatabaseSync): void {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_file_name TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      row_count INTEGER NOT NULL,
      inserted_count INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS raw_import_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      fingerprint TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      treatment TEXT NOT NULL,
      exclusion_reason TEXT,
      UNIQUE(import_batch_id, row_number)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      fingerprint TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_file_name TEXT NOT NULL,
      source_row_number INTEGER NOT NULL,
      account_label TEXT NOT NULL,
      transaction_at TEXT NOT NULL,
      signed_amount_cents INTEGER NOT NULL,
      description TEXT NOT NULL,
      external_id TEXT,
      original_category TEXT,
      original_parent_category TEXT,
      transaction_type TEXT,
      treatment TEXT NOT NULL CHECK(treatment IN ('included','excluded','unresolved')),
      direction TEXT NOT NULL CHECK(direction IN ('expense','income','refund','excluded','unresolved')),
      exclusion_reason TEXT,
      chosen_category TEXT NOT NULL,
      classification_rule TEXT NOT NULL,
      confidence REAL NOT NULL,
      review_required INTEGER NOT NULL CHECK(review_required IN (0,1)),
      first_import_batch_id INTEGER NOT NULL REFERENCES import_batches(id),
      last_import_batch_id INTEGER NOT NULL REFERENCES import_batches(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_review ON transactions(review_required, treatment);

    CREATE TABLE IF NOT EXISTS classification_overrides (
      transaction_fingerprint TEXT PRIMARY KEY REFERENCES transactions(fingerprint) ON DELETE CASCADE,
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pay_statements (
      pay_statement_id TEXT PRIMARY KEY,
      pay_date TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      employer_label TEXT NOT NULL,
      gross_pay_cents INTEGER NOT NULL,
      net_pay_cents INTEGER NOT NULL,
      taxes_cents INTEGER NOT NULL,
      deductions_cents INTEGER NOT NULL,
      regular_hours REAL NOT NULL DEFAULT 0,
      regular_rate_cents INTEGER NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      overtime_rate_cents INTEGER NOT NULL DEFAULT 0,
      source_file_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assumptions (
      assumption_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value_number REAL NOT NULL,
      unit TEXT NOT NULL,
      effective_date TEXT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forecast_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      data_cutoffs_json TEXT NOT NULL,
      assumptions_json TEXT NOT NULL,
      category_methods_json TEXT NOT NULL,
      model_version TEXT NOT NULL,
      scenario TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reconciliation_checks (
      check_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      status TEXT NOT NULL,
      actual_value REAL,
      expected_value REAL,
      difference REAL,
      tolerance REAL NOT NULL,
      fix_hint TEXT NOT NULL,
      notes TEXT NOT NULL,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
  `);
}

export function importTransactions(_db: DatabaseSync, _sourceType: string, _fileName: string, _rows: StoredTransaction[]): { inserted: number; duplicates: number } {
  const insertBatch = _db.prepare(
    "INSERT INTO import_batches(source_type, source_file_name, row_count) VALUES (?, ?, ?)",
  );
  const batchId = Number(insertBatch.run(_sourceType, _fileName, _rows.length).lastInsertRowid);
  const rawInsert = _db.prepare(`
    INSERT INTO raw_import_rows(import_batch_id, row_number, fingerprint, raw_json, treatment, exclusion_reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const existing = _db.prepare("SELECT 1 FROM transactions WHERE fingerprint = ?");
  const legacyByExternalId = _db.prepare(`
    SELECT t.fingerprint, o.category AS override_category, o.note AS override_note
    FROM transactions t
    LEFT JOIN classification_overrides o ON o.transaction_fingerprint = t.fingerprint
    WHERE t.source_type = ? AND t.external_id = ? AND t.fingerprint <> ?
  `);
  const deleteTransaction = _db.prepare("DELETE FROM transactions WHERE fingerprint = ?");
  const restoreOverride = _db.prepare(`
    INSERT INTO classification_overrides(transaction_fingerprint, category, note)
    VALUES (?, ?, ?)
    ON CONFLICT(transaction_fingerprint) DO UPDATE SET
      category = excluded.category,
      note = excluded.note,
      updated_at = CURRENT_TIMESTAMP
  `);
  const applyOverride = _db.prepare(`
    UPDATE transactions
    SET chosen_category = ?, classification_rule = 'user_override', confidence = 1.0,
        review_required = 0, treatment = 'included',
        direction = CASE WHEN signed_amount_cents < 0 THEN 'expense' ELSE direction END,
        updated_at = CURRENT_TIMESTAMP
    WHERE fingerprint = ?
  `);
  const transactionUpsert = _db.prepare(`
    INSERT INTO transactions(
      fingerprint, source_type, source_file_name, source_row_number, account_label,
      transaction_at, signed_amount_cents, description, external_id, original_category,
      original_parent_category, transaction_type, treatment, direction, exclusion_reason,
      chosen_category, classification_rule, confidence, review_required,
      first_import_batch_id, last_import_batch_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      source_file_name = excluded.source_file_name,
      source_row_number = excluded.source_row_number,
      account_label = excluded.account_label,
      transaction_at = excluded.transaction_at,
      signed_amount_cents = excluded.signed_amount_cents,
      description = excluded.description,
      external_id = excluded.external_id,
      original_category = excluded.original_category,
      original_parent_category = excluded.original_parent_category,
      transaction_type = excluded.transaction_type,
      treatment = excluded.treatment,
      direction = excluded.direction,
      exclusion_reason = excluded.exclusion_reason,
      chosen_category = CASE
        WHEN EXISTS (SELECT 1 FROM classification_overrides WHERE transaction_fingerprint = excluded.fingerprint)
          THEN transactions.chosen_category
        ELSE excluded.chosen_category
      END,
      classification_rule = CASE
        WHEN EXISTS (SELECT 1 FROM classification_overrides WHERE transaction_fingerprint = excluded.fingerprint)
          THEN 'user_override'
        ELSE excluded.classification_rule
      END,
      confidence = CASE
        WHEN EXISTS (SELECT 1 FROM classification_overrides WHERE transaction_fingerprint = excluded.fingerprint)
          THEN 1.0
        ELSE excluded.confidence
      END,
      review_required = CASE
        WHEN EXISTS (SELECT 1 FROM classification_overrides WHERE transaction_fingerprint = excluded.fingerprint)
          THEN 0
        ELSE excluded.review_required
      END,
      last_import_batch_id = excluded.last_import_batch_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  let inserted = 0;
  let duplicates = 0;
  _db.exec("BEGIN IMMEDIATE");
  try {
    for (const row of _rows) {
      rawInsert.run(batchId, row.rowNumber, row.fingerprint, row.rawJson, row.treatment, row.exclusionReason ?? null);
      const exactMatch = Boolean(existing.get(row.fingerprint));
      let savedOverride: { category: SpendingCategory; note: string } | undefined;
      const legacyRows = row.externalId
        ? legacyByExternalId.all(row.sourceType, row.externalId, row.fingerprint) as Array<{
            fingerprint: string;
            override_category: SpendingCategory | null;
            override_note: string | null;
          }>
        : [];
      for (const legacy of legacyRows) {
        if (legacy.override_category) {
          savedOverride = { category: legacy.override_category, note: legacy.override_note ?? "" };
        }
        deleteTransaction.run(legacy.fingerprint);
      }
      if (exactMatch || legacyRows.length) duplicates += 1;
      else inserted += 1;
      transactionUpsert.run(
        row.fingerprint,
        row.sourceType,
        _fileName,
        row.rowNumber,
        row.account,
        row.transactionAt,
        row.signedAmountCents,
        row.description,
        row.externalId ?? null,
        row.originalCategory ?? null,
        row.originalParentCategory ?? null,
        row.transactionType ?? null,
        row.treatment,
        row.direction,
        row.exclusionReason ?? null,
        row.chosenCategory,
        row.classificationRule,
        row.confidence,
        row.review ? 1 : 0,
        batchId,
        batchId,
      );
      if (savedOverride) {
        restoreOverride.run(row.fingerprint, savedOverride.category, savedOverride.note);
        applyOverride.run(savedOverride.category, row.fingerprint);
      }
    }
    _db.prepare("UPDATE import_batches SET inserted_count = ?, duplicate_count = ? WHERE id = ?").run(inserted, duplicates, batchId);
    _db.exec("COMMIT");
  } catch (error) {
    _db.exec("ROLLBACK");
    throw error;
  }
  return { inserted, duplicates };
}

export function setClassificationOverride(_db: DatabaseSync, _fingerprint: string, _category: SpendingCategory, _note: string): void {
  _db.prepare(`
    INSERT INTO classification_overrides(transaction_fingerprint, category, note)
    VALUES (?, ?, ?)
    ON CONFLICT(transaction_fingerprint) DO UPDATE SET
      category = excluded.category,
      note = excluded.note,
      updated_at = CURRENT_TIMESTAMP
  `).run(_fingerprint, _category, _note);
  _db.prepare(`
    UPDATE transactions
    SET chosen_category = ?, classification_rule = 'user_override', confidence = 1.0,
        review_required = 0, treatment = 'included',
        direction = CASE WHEN signed_amount_cents < 0 THEN 'expense' ELSE direction END,
        updated_at = CURRENT_TIMESTAMP
    WHERE fingerprint = ?
  `).run(_category, _fingerprint);
}

export function getTransaction(_db: DatabaseSync, _fingerprint: string): Record<string, unknown> | undefined {
  return _db.prepare("SELECT * FROM transactions WHERE fingerprint = ?").get(_fingerprint) as Record<string, unknown> | undefined;
}
