# Cashflow Calculator - Runbook

> Generated from LLM Workbench v3.1.1. See Upgrading The Harness
> below.

**Last reviewed:** 2026-09-04
**Runtime owner:** Kayden Clark (single local operator)
**Environment:** local only; loopback-bound, never deployed

This file explains how to operate, verify, recover, and evaluate the project. It
should be boring, exact, and executable.

## Ordinary Entry

Follow `AGENTS.md` -> this section -> `LEXICON.md` -> Task Routing. Inspect the
root, branch, upstream and dirty state; run the project-local spec doctor and
load the explicitly assigned spec. For owner-directed pickup, use `next --json`
and `show` to resolve that assignment. The spec and ticket set the normal
stance. Investigate within the task; do not invent a next task when blocked.
Load remaining Runbook sections only for the operation being performed.

For a setup-only Round One assignment, a fresh agent follows that route, checks
the manifest, relevant Wiki and ADRs, and runs read-only configuration checks.
Return the result in chat only: no feedback report, handoff, checkpoint,
self-created task, or other prose artifact. Round One precedes feedback testing.

## Prerequisites

Required tools:

- Node.js 24 or newer (the SQLite layer uses the built-in `node:sqlite` module)
- npm 11 or newer

Required accounts/services:

- None. This project has no external account, API key, or hosted dependency.

Required local files:

- `~/.cashflow-calculator/data/cashflow.sqlite` - the private database. Do not
  create it by hand; the API creates the directory and an empty schema on first
  start. Never place it inside this repository.
- Your own CSV exports from the bank or payment service, kept anywhere outside
  this repository, and imported through the app rather than copied in.

## Environment Configuration

There is no example environment file to copy and no required variable: every
setting below has a working default. Export a variable in your shell only when
you need to override the default.

Optional variables:

| Variable | Purpose | Secret? | Example / Notes |
|---|---|---|---|
| `CASHFLOW_DATA_ROOT` | External directory holding the private data directory | no | Defaults to `~/.cashflow-calculator`. Must resolve outside this repository. |
| `CASHFLOW_DB_PATH` | Full path to the SQLite file, overriding the data root | no | Useful for a disposable database during manual testing. |
| `CASHFLOW_OWNER_NAME` | Account-owner name used to interpret payment-service exports | yes - it is personal data | Set it in your shell only; never commit it or paste it into a doc. |
| `PORT` | API port | no | Defaults to `4310`. |

Rules:

- Do not commit real `.env` files, tokens, local databases, logs, or private
  data.
- Keep secrets server-side or local-only.
- Prefer degraded states over fake data when an external source is unavailable.

## Install

```bash
npm install
```

Expected result:

- npm completes without an error and `node_modules/` exists. No database is
  created and no network service is contacted at install time.

## Run Locally

```bash
npm run dev
```

This runs the API (`tsx watch src/server/index.ts`) and the Vite dev server
together. To run only one, use `npm run dev:api` or `npm run dev:web`.

Open:

- Website: `http://127.0.0.1:4311`
- API health: `http://127.0.0.1:4310/api/health`

Expected result:

- The API logs `Cashflow API listening at http://127.0.0.1:4310`.
- `/api/health` returns `{"ok":true,"host":"127.0.0.1","database":"cashflow.sqlite"}`.
- The website loads the Overview page. On a fresh machine every figure is empty
  or zero, because the database starts with no account data.

## Test And Build

Fast check:

```bash
npm test
```

A single file while iterating:

```bash
npx vitest run tests/finance.test.ts
```

Full verification:

```bash
npm test
npm run typecheck
npm run lint
npm run build
node workbench/tools/spec-workbench.mjs doctor
```

Expected result:

- Every Vitest file passes; `tsc -b`, `eslint .`, and the Vite build exit
  cleanly; `doctor` reports no `all` or `selection` finding. The build prints a
  chunk-size warning for the client bundle - that is a known, accepted warning,
  not a failure. As of 2026-09-04 the suite is 7 files / 42 tests; treat a
  changed count as something to explain, not as a target to match.

### Test Coverage Policy

Treat tests as the project specification, not as a comfort signal. The suite
should be strong enough that if someone accidentally deletes a meaningful line,
branch, route, data contract, workflow step, validation rule, or bug fix, at
least one test or documented manual check fails.

Coverage rules:

- Prefer red/green TDD: write or update the failing test first, confirm the
  expected failure, then implement the smallest fix.
- Run every relevant existing test before judging the suite.
- Keep tests that prove behavior a user, API consumer, operator, or future
  maintainer depends on.
- Improve tests that assert the wrong level, hide real failures, rely on stale
  fixtures, overuse snapshots, or pass without checking meaningful behavior.
- Remove tests that are stale, duplicated without adding a boundary, or pure
  bloat.
- If behavior cannot be tested in the current harness, record the exact reason
  and use the strongest concrete manual check available.

## Workbench Lifecycle, Diagnostics, And Decision Records

The project runs its own installed runtime tools from the manifest-declared
tools lane:

```bash
node workbench/tools/spec-workbench.mjs next --json
node workbench/tools/spec-workbench.mjs show S-###
node workbench/tools/spec-workbench.mjs claim S-### --agent NAME
node workbench/tools/spec-workbench.mjs close S-### --proof "..." --docs "..." --remaining-gap "..."
node workbench/tools/spec-workbench.mjs render
node workbench/tools/spec-workbench.mjs doctor
node workbench/tools/adr.mjs new --title "Decision title"
node workbench/tools/adr.mjs validate
node workbench/tools/adr.mjs register
```

`doctor` prints every registered finding with its severity and blocking
effect and exits non-zero only for `all` or `selection` findings; a
`selected-slice` finding is excluded by `next` and refused by `claim`, and an
`attention` finding stays visible without blocking. Decision records live in
`workbench/docs/adr/`; an accepted record names the control that carries its
rule in `canonicalized_in`, and `register` derives `REGISTER.md`.

## Evaluation And Benchmarking

Use this section to prove whether the workbench or project process is improving.
The goal is evidence, not taste.

### Benchmark-Driven Improvement

Before changing agent rules, control docs, evaluation criteria, or the working
process, capture the available guardrail or benchmark baseline. Put the intended
score movement or outcome hypothesis in the owning spec, then record the
before/after score and remaining recommendations after the change.

Use 100/100 as a deliberately hard north star, not the release gate. Regression
checks are the minimum ship gate. Never weaken a criterion to manufacture
progress, and do not treat a static coverage score as outcome evidence. If this
project has no executable benchmark yet, add one or state that the change cannot
yet be called better.

### Claims To Test

The harness or process is only worth calling better when it can support at least
one of these claims:

1. Better than no project instructions.
2. Better than a representative generic instruction file.
3. Better than the prior version on the same task suite.

### Evaluation Design

Use controlled conditions:

| Condition | What the agent gets | Purpose |
|---|---|---|
| `c0_none` | no project instructions | baseline |
| `c1_generic` | a generic `AGENTS.md` / `CLAUDE.md` style file | common alternative |
| `c2_current` | current project or template docs | current candidate |
| `c3_candidate` | proposed branch or changed docs | improvement test |

Score task outcomes, not how good the docs feel. Useful dimensions:

| Dimension | What it measures |
|---|---|
| Correctness | hidden or independent acceptance check passes |
| Scope adherence | changed files stay inside the task allowlist |
| Verification honesty | final claims match independently rerun checks |
| Docs upkeep | stale docs were updated or explicitly marked unchanged |

Run multiple trials per condition when using stochastic agents. Report effect
size and confidence interval when possible. Do not claim broad proof from one
run.

### Workbench Evaluation Commands

This project ships no evaluation harness of its own. The static control-surface
evaluator and the runnable trial framework live in the upstream LLM Workbench
repository; run them from a checked-out copy of it against this project:

```bash
node /PATH/TO/LLM_WORKBENCH/tools/evaluate-workbench.mjs \
  --path "/Users/kayden/Projects/Cashflow Calculator" --include-controls
```

Until an executable benchmark exists here, a process change to this project
cannot be called an improvement on evidence - say so rather than implying it.

Real comparison runs may spend API budget. Size the run first and record the
model, conditions, task suite, trial count, and result path before making claims.

### Harness Feedback Loop

This project's `WORKBENCH_FEEDBACK.md` is the return channel to the upstream
harness. Lessons logged there feed harness changes, which must clear the same
bar as any other "better" claim: a proposed template change is `c3_candidate`
above, tested against the current docs on the same task suite before it ships.
Feedback flows out; validated improvements flow back in as a harness upgrade
(Upgrading The Harness, above). Taste alone never closes the loop; evidence does.

## Data Operations

Use this section only if the project has seed data, migrations, imports, local
databases, or generated feeds.

Seed/import: there is no seeding command and no committed fixture of real data.
Import happens through the running application, which previews a CSV before
committing it:

```bash
curl -s -X POST http://127.0.0.1:4310/api/import/preview \
  -H 'content-type: application/json' \
  -d '{"sourceType":"bank","fileName":"sample.csv","text":"<csv text>"}'
```

Use the website's import screen for ordinary use; the endpoint above is for
debugging a parse or classification problem with synthetic rows.

Migration: schema migration is automatic. `migrateDatabase` runs at API startup
and applies any missing statement, recording it in `schema_migrations`. There is
no separate migration command; to apply a new migration, restart the API.

Backup/restore: copy the database file while the API is stopped.

```bash
cp ~/.cashflow-calculator/data/cashflow.sqlite \
   ~/.cashflow-calculator/data/cashflow.backup-$(date +%Y%m%d).sqlite
```

Safety rules:

- These commands may modify only files under the external data root
  (`CASHFLOW_DATA_ROOT`, default `~/.cashflow-calculator`).
- They must never write inside this repository, and no backup, export, or
  database copy may be placed on a tracked path.
- Verify after an import by checking that the Data Health page reports the
  expected batch and that no transaction landed in `Needs Review`
  unintentionally; verify after a restore by starting the API and confirming
  `/api/health` plus a known period total.

## Deployment Or Startup

Use this section only if the project has deployment, LaunchAgent, cron,
scheduler, or service startup behavior.

This project is not deployed. There is no LaunchAgent, cron job, scheduler, or
hosted environment - it runs as a foreground local process and stops when you
close it.

Start/restart:

```bash
npm run dev
```

To run the API alone against the built output, use `npm start`.

Stop:

```bash
# Ctrl-C in the terminal running npm run dev
```

Logs:

```bash
# The API and Vite log to that terminal's stdout; there is no log file.
```

Expected healthy state:

- `curl -s http://127.0.0.1:4310/api/health` returns `{"ok":true,...}` and
  `http://127.0.0.1:4311` serves the site. Nothing should be listening on a
  non-loopback interface.

## Version-Control Procedures

Git authority and policy live in `AGENTS.md` -> Git Rules. Keep executable
commands and expected results here:

```bash
git status --short && git branch --show-current
git switch -c claude/S-###-short-slug main
git diff --stat main...HEAD
gh pr create --base main --title "..." --body "..."
```

Expected result: the diff touches only files inside the assigned task's scope,
the base is `main`, and the PR is reviewable. Pushing and opening the PR both
require the user's explicit authorization (`AGENTS.md` -> Safety And Change
Control).

Closeout. This repository has no separate integration branch: `main` is the only
long-lived branch and merging into it is owner-only. An agent's closeout
therefore ends at an authorized push and an open, reviewed PR. The owner runs
the merge.

After the owner has merged, verify containment before any cleanup. Pin the
reviewed commit and reject a changed candidate; never delete a branch before
containment is verified.

```bash
(
set -eu
REVIEWED=$(git rev-parse claude/S-###-short-slug)
git fetch origin main
git merge-base --is-ancestor "$REVIEWED" origin/main
echo "main contains $REVIEWED"
)
```

After successful verification, if cleanup is authorized:

```bash
git branch -d claude/S-###-short-slug
git push origin --delete claude/S-###-short-slug
```

Expected result: `main` contains the reviewed commit; the merged branch is
deleted locally and remotely; unmerged work is never force-deleted with `-D`.

When cleanup is owner-deferred, `main` contains the reviewed work and the
branches remain available for later cleanup.

## Upgrading The Harness

These control docs were generated from a specific LLM Workbench version, recorded
in the `Generated from LLM Workbench v3.1.1` stamp at the top of each
doc. That stamp lets you tell when the project is running an older harness than
the current one.

To upgrade:

1. Check the LLM Workbench repo's releases/changelog for what changed since
   `v3.1.1`.
2. Re-copy only the changed template sections; keep this project's filled-in
   specifics. Never let an unfilled template placeholder leak back into a
   filled doc.
3. Update each doc's version stamp to the new version.
4. Re-run the full verification suite and record the upgrade in its owning spec.

The runtime tools in `workbench/tools/` are Workbench-managed: their receipt
(`.workbench-tools.json`) records the exact source release, commit, and file
hashes. Verify them with `node /PATH/TO/LLM_WORKBENCH/tools/workbench-tools.mjs verify --project .`
and replace them only through `update --explicit-update`, which backs up the
previous files and records a rollback path. Never hand-edit a managed tool.

Managed-tool updates and rollbacks reject symlinked lane ancestors, linked or
nonregular managed files, and unsafe backup entries before copying or creating
backups. Resolve the path collision while preserving its target, then retry the
explicit operation. Ordinary drift in a regular managed file still receives a
backup and can be restored.

Layout initialization and schema migration preserve existing session ignore
rules and reject linked destination paths before writes. ADR creation, register
rendering and checkpoint promotion also reject unsafe destination chains and
use private temporary files. Legacy Wiki adoption moves existing knowledge
before seeding only the missing contract files.

Treat a harness upgrade like any other change: smallest correct diff, verified,
with proof. If a downstream lesson should flow *back* to the harness, capture it
per the project's `WORKBENCH_FEEDBACK` convention.

## Manual Harness Feedback Reports

Run this workflow after a setup-only Round One check succeeds. It assesses the
assigned target; it never authorizes a repair or invokes automated repair.

1. Resolve `lanes.feedback`, `lanes.specs` and the relevant collections through
   `workbench/manifest.json`. Pin the target revision and the assigned question.
2. Inspect only relevant controls, source and named proof. Test consequential
   claims, distinguish observation from inference, and disclose evidence limits.
3. Write `REPORT-topic-date.md` in the declared feedback lane using its
   `REPORT_FORMAT.md`. Include Target And Scope, Evidence And Limitations,
   Findings, Challenged Or Rejected Findings, Next Action And Open Questions,
   and Review Boundary. No findings is valid. Reports never live loose or in
   the Wiki. If the format is absent in an older installation, these sections
   are sufficient; explicit upgrades may copy it from the source templates.
4. Put accepted follow-up work in its existing linked spec; proposed repairs
   remain pending owner authorization. A report is not a work assignment.
5. At a meaningful continuation boundary, a fresh session should find the report,
   its linked spec, and the next executable action or owner gate using repository
   state only. No universal handoff or new self-created task is required.
6. Before integration, the candidate's separate-context review challenges the
   report's consequential claims and recommendations along with the change.

## Troubleshooting

| Symptom | Likely cause | Check | Fix |
|---|---|---|---|
| API exits at startup with a `node:sqlite` error | Node.js older than 24; the built-in SQLite module is missing | `node --version` | Install Node.js 24 or newer. |
| Website loads but every panel is empty | The database is genuinely empty; this is the fresh-install state | `curl -s http://127.0.0.1:4310/api/health` | Import a CSV export through the import screen. |
| Website loads but API calls 404 or hang | The API is not running, or Vite's proxy target is wrong | `curl -s http://127.0.0.1:4310/api/health`; check `proxy` in `vite.config.ts` | Start `npm run dev:api`, or restore the proxy to `http://127.0.0.1:4310`. |
| Port already in use on 4310 or 4311 | A previous `npm run dev` is still running | `lsof -i :4310 -i :4311` | Stop the old process, or set `PORT` for the API. |
| Many imported rows land in `Needs Review` | No rule matched the export's description format | Open the Data Health page; inspect `raw_import_rows` for the batch | Add or correct a rule in `DEFAULT_CLASSIFICATION_RULES`, with a test; do not bulk-assign a category to clear the queue. |
| A re-import duplicates transactions | Fingerprint inputs changed, so the content key no longer matches | Compare `fingerprint` values for the duplicate pair | Fix `transactionFingerprint` rather than deleting rows; a fingerprint change is a review-required change. |
| `npm run build` warns about chunk size | The client bundle exceeds 500 kB | Read the build output | Known and accepted. Not a failure; do not silence it by raising the limit without a decision. |

## Recovery And Rollback

If a change fails:

1. Identify the touched files and failing command.
2. Revert only the smallest change needed, preserving user work.
3. Rerun the failing verification command.
4. Update the owning spec with the result and remaining gap, then render.

Do not delete data, reset databases, rewrite history, or rotate secrets unless
the user explicitly approves that action.

## Operational Proof

If a command changed durable project state, append evidence to the owning spec.
For routine read-only runs, a final response note is enough.
