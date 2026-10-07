# Cashflow Calculator - Blueprint

> Generated from LLM Workbench v3.1.1.

**Last reviewed:** 2026-09-04
**Status:** active
**Source root:** `/Users/kayden/Projects/Cashflow Calculator`

## Product Map

Cashflow Calculator is a local-first personal cash-flow workspace. It imports
bank and payment-service CSV exports plus payroll statements into a private
SQLite database that lives outside the repository, classifies each transaction
into a fixed spending taxonomy, aligns spending to pay-period cash windows
rather than calendar months, and projects forward margin under base, lower, and
higher scenarios. It serves a single owner running it on their own machine; the
problem it solves is knowing, between paychecks, whether the money already spent
leaves enough for the money still committed.

Core promise:

> Import your own statements and see, per pay period and month to date, exactly
> where the money went and whether the next period clears - without any of that
> data ever leaving your machine or entering this repository.

## Goals And Pillars

- **Local-first and private:** all financial data stays in an external data
  root; the repository holds code only, and the servers stay on `127.0.0.1`.
- **Pay-period truth over calendar truth:** cash windows derived from actual pay
  statements are the primary unit of analysis, with month-to-date as a secondary
  view that reports its own coverage confidence.
- **Honest classification:** every transaction lands in a named category or in
  `Needs Review`; the system surfaces what it could not confidently classify
  rather than guessing silently.
- **Integer-cent arithmetic:** money is never a float anywhere in the stack.

## Cross-Cutting Architecture And Invariants

| Layer / concern | Choice | Invariant / source |
|---|---|---|
| Runtime | Node.js 24+, TypeScript 6, ESM modules | `package.json` (`"type": "module"`), `tsconfig*.json` |
| Product surface | React 19 + Vite 8 SPA on `127.0.0.1:4311`; Express 5 JSON API on `127.0.0.1:4310` | `vite.config.ts`, `src/server/index.ts` |
| Data/storage | SQLite through the built-in `node:sqlite` `DatabaseSync`, in an external data root | `src/server/database.ts`, `src/server/index.ts` |
| Testing | Vitest 4 (node environment) over `tests/**/*.test.ts`, with supertest for API paths; Playwright installed for future browser tests, excluded from the unit run | `vitest.config.ts`, `tests/` |
| Deployment/runtime | None. Local process only, started by `npm run dev`; no hosting, telemetry, or external runtime service | `README.md`, `vite.config.ts` |

Rules that span multiple capabilities:

- All monetary values are integer cents. `calculateCashMetrics` throws a
  `TypeError` on a non-integer amount rather than coercing it.
- Ratios are `null`, not `0` or `NaN`, when inflow is zero. Callers must render
  the unknown case rather than a fabricated number.
- The database path resolves to `CASHFLOW_DB_PATH`, else
  `CASHFLOW_DATA_ROOT/data/cashflow.sqlite`, else
  `~/.cashflow-calculator/data/cashflow.sqlite`. No code path may place it
  inside the repository.
- Both servers bind `127.0.0.1`. There is no authentication and no per-user
  authorization; the loopback binding is currently the only access boundary.
- Dates crossing a domain boundary are ISO `YYYY-MM-DD` and are round-trip
  validated, so a calendar-impossible date is rejected instead of rolling
  forward into the next month.
- A transaction whose classification is not confident becomes `Needs Review`
  rather than being forced into a category.

Source and tests say what is implemented; this file and the assigned spec say
what is accepted (`AGENTS.md` -> State Resolution). Put capability-specific
requirements and decisions in its stable spec, not here. Consequential
architectural decisions with real alternatives get a record in
`workbench/docs/adr/`; the rule they establish still lives in the owning
control. Put accepted project-wide definitions in `LEXICON.md`.

## Design Decisions

- **Pay windows, not calendar months, are the primary period.** `PayStatement`
  records drive `buildCashWindows`, and `CashWindow` carries a `PeriodStatus` of
  `Actual`, `Provisional`, or `Forecast`. Month-to-date exists as a secondary
  lens that publishes its own `CoverageConfidence`.
- **Classification is rule-driven with a manual override table.**
  `DEFAULT_CLASSIFICATION_RULES` in `src/server/importers.ts` drives automatic
  assignment; `classification_overrides` records owner corrections keyed by
  transaction fingerprint, so re-import does not lose a manual decision.
- **Deduplication is by content fingerprint.** `transactionFingerprint` derives
  a stable key from normalized transaction fields, letting overlapping CSV
  exports be imported repeatedly without duplicating rows.
- **Raw import rows are retained.** `raw_import_rows` keeps the source row
  alongside the normalized `transactions` row, so a classification or
  normalization bug can be diagnosed and replayed without re-exporting from the
  bank.
- **Drift logged at adoption (2026-09-04):** `.claude/launch.json` declared port
  `5173`, the Vite default, while `vite.config.ts` serves `4311`. The config was
  corrected to the real port. Observed reality outranked the stale config.
- **Drift logged at adoption (2026-09-04):** several domain functions keep
  underscore-prefixed parameter names (`_inflowCents`, `_start`) inherited from
  an earlier stub phase. The functions are fully implemented; the names are
  cosmetic residue, not a signal of unimplemented behavior.

## Non-Goals

- Multi-user accounts, hosted deployment, or any network-reachable binding
  before backend authentication and per-user authorization exist.
- Storing, seeding, or committing real financial records, statements, reports,
  or account-specific configuration in this repository.
- Direct bank connectivity, aggregator APIs, or any external runtime service.
  Import is by owner-supplied CSV export only.
- Investment, tax, or advisory calculation. This reports the owner's own cash
  movement; it does not recommend financial action.

## Spec Catalog

The generated catalog links every durable capability record, including completed
history. Human-authored product prose stays outside the markers.

<!-- spec-catalog:start -->
| Spec | Description | Status |
|---|---|---|
| [S-001 - LLM Workbench Adoption](workbench/specs/S-001-workbench-adoption/SPEC.md) | Migrate this repository onto the v3.1.1 LLM Workbench control surface without losing the project's existing rules, docs, or green baseline. | complete |
| [S-002 - Backend Authentication And Per-User Authorization](workbench/specs/S-002-backend-authentication/SPEC.md) | Replace the loopback binding as the only access boundary with real backend authentication and per-user authorization over financial data. | planned |
<!-- spec-catalog:end -->

## Cross-Cutting Health

- `npm test` passes (7 test files, 42 tests as of 2026-09-04);
- `npm run typecheck`, `npm run lint`, and `npm run build` pass;
- the primary workflow succeeds end to end: import a synthetic CSV, see it
  classified, and see the pay-period and forecast views update;
- financial data and generated reports stay out of committed output;
- spec doctor/render checks report no lifecycle, link, or projection drift.

## Workbench Entry And Delivery Boundaries

The seven-control Contract enters through AGENTS -> RUNBOOK -> LEXICON, then
assigned work and task-relevant owners. This Blueprint loads for architecture
and cross-cutting direction. SPEC and TASK assign portable stances; stances
change method without transferring authority or spawning agents. Independent
review is required before a branch merges into `main`. Required steps need
immediate delivery value; uncertain practices remain optional and reviewable.
