import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { SPENDING_CATEGORIES, type SpendingCategory } from "../domain/types.js";
import { getAppState, recordForecastRun } from "./analytics.js";
import { createDatabase, migrateDatabase, setClassificationOverride } from "./database.js";
import { importCsvText, previewCsv } from "./importers.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataRoot = process.env.CASHFLOW_DATA_ROOT || path.join(os.homedir(), ".cashflow-calculator");
const dataDir = path.join(dataRoot, "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.CASHFLOW_DB_PATH || path.join(dataDir, "cashflow.sqlite");
const db = createDatabase(dbPath);
migrateDatabase(db);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, host: "127.0.0.1", database: path.basename(dbPath) });
});

app.get("/api/state", (request, response) => {
  const scenario = request.query.scenario === "lower" || request.query.scenario === "higher" ? request.query.scenario : "base";
  response.json(getAppState(db, scenario));
});

app.patch("/api/assumptions/:key", (request, response) => {
  const value = Number(request.body.value);
  if (!Number.isFinite(value)) return response.status(400).json({ error: "Assumption value must be numeric" });
  const existing = db.prepare("SELECT 1 FROM assumptions WHERE assumption_key = ?").get(request.params.key);
  if (!existing) return response.status(404).json({ error: "Assumption was not found" });
  db.prepare(`
    UPDATE assumptions
    SET value_number = ?, effective_date = COALESCE(?, effective_date), notes = COALESCE(?, notes),
        status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP
    WHERE assumption_key = ?
  `).run(value, request.body.effectiveDate ?? null, request.body.notes ?? null, request.body.status ?? null, request.params.key);
  recordForecastRun(db, "base");
  return response.json({ ok: true });
});

app.patch("/api/transactions/:fingerprint/classification", (request, response) => {
  const category = request.body.category as SpendingCategory;
  if (!SPENDING_CATEGORIES.includes(category)) return response.status(400).json({ error: "Unknown spending category" });
  const transaction = db.prepare("SELECT 1 FROM transactions WHERE fingerprint = ?").get(request.params.fingerprint);
  if (!transaction) return response.status(404).json({ error: "Transaction was not found" });
  setClassificationOverride(db, request.params.fingerprint, category, String(request.body.note ?? ""));
  recordForecastRun(db, "base");
  return response.json({ ok: true });
});

app.post("/api/forecast/recalculate", (request, response) => {
  const scenario = request.body.scenario === "lower" || request.body.scenario === "higher" ? request.body.scenario : "base";
  recordForecastRun(db, scenario);
  response.json(getAppState(db, scenario));
});

app.post("/api/import/preview", (request, response) => {
  const { sourceType, fileName, csvText } = request.body as { sourceType?: string; fileName?: string; csvText?: string };
  if ((sourceType !== "bank" && sourceType !== "venmo") || !fileName || !csvText) {
    return response.status(400).json({ error: "sourceType, fileName, and csvText are required" });
  }
  const rows = previewCsv(sourceType, path.basename(fileName), csvText);
  const fingerprints = rows.map((row) => row.fingerprint);
  let duplicates = 0;
  const find = db.prepare("SELECT 1 FROM transactions WHERE fingerprint = ?");
  for (const fingerprint of fingerprints) if (find.get(fingerprint)) duplicates += 1;
  return response.json({
    fileName: path.basename(fileName),
    sourceType,
    rowCount: rows.length,
    duplicateCount: duplicates,
    includedCount: rows.filter((row) => row.treatment === "included").length,
    excludedCount: rows.filter((row) => row.treatment === "excluded").length,
    unresolvedCount: rows.filter((row) => row.treatment === "unresolved").length,
    preview: rows.slice(0, 12).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "rawJson"))),
  });
});

app.post("/api/import/commit", (request, response) => {
  const { sourceType, fileName, csvText } = request.body as { sourceType?: string; fileName?: string; csvText?: string };
  if ((sourceType !== "bank" && sourceType !== "venmo") || !fileName || !csvText) {
    return response.status(400).json({ error: "sourceType, fileName, and csvText are required" });
  }
  const result = importCsvText(db, sourceType, path.basename(fileName), csvText);
  recordForecastRun(db, "base");
  return response.json(result);
});

const distDir = path.join(projectRoot, "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.method === "GET" && request.accepts("html")) return response.sendFile(path.join(distDir, "index.html"));
    return next();
  });
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  void _next;
  const message = error instanceof Error ? error.message : "Unexpected error";
  response.status(500).json({ error: message });
});

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4310);
const server = app.listen(port, host, () => console.log(`Cashflow API listening at http://${host}:${port}`));

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
