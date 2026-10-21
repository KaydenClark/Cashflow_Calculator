# Cashflow Calculator

> Generated from LLM Workbench v3.1.1. See `RUNBOOK.md` -> Upgrading The Harness.

Cashflow Calculator is a local-first React and SQLite website for importing your
own financial records, reviewing cash flow by pay period, and exploring
forecasts.

It runs entirely on one machine. The repository contains application code only:
no personal financial records, private seed files, generated reports, or
account-specific configuration. The database is created outside the repository
and starts empty.

## How This Project Is Run

This repository is governed by a small set of control documents. Read them
before changing anything:

- [`AGENTS.md`](AGENTS.md) - how agents behave here: authority order, read/edit
  scope, the privacy boundary, the task-selection loop, documentation
  ownership, and proof rules.
- [`BLUEPRINT.md`](BLUEPRINT.md) - compact product map, cross-cutting
  architecture/invariants, non-goals, and spec catalog.
- [`LEXICON.md`](LEXICON.md) - accepted project-wide terms and definitions;
  consult it when shared language could be ambiguous.
- [`TASKBOARD.md`](TASKBOARD.md) - active spec projection: current slice, owner,
  blocker, latest event, and next gate.
- [`workbench/specs/S-###-slug/SPEC.md`](workbench/specs) - on-demand capability
  truth, acceptance, decisions, verification, append-only evidence, and
  completion.
- [`RUNBOOK.md`](RUNBOOK.md) - how to set up, run, test, build, and recover this
  project, plus the verification commands that gate "done".
- [`workbench/wiki/MEMORY.md`](workbench/wiki/MEMORY.md) - the room brain:
  canonical, human-editable durable memory for this project. It routes to the
  live controls above, to flat memory notes, and to the owner-directed
  `design-concepts/` collection; it never duplicates live task state.
- [`workbench/feedback/WORKBENCH_FEEDBACK.md`](workbench/feedback/WORKBENCH_FEEDBACK.md) -
  Workbench Feedback, the return channel to the reusable harness these docs came
  from: log where the harness rules themselves are unclear, wrong, or slow the
  work down, so they can be improved upstream. It lives in the feedback lane so
  the root keeps exactly seven controls.

Project-local references the harness does not own:

- [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) - field, metric, and
  category definitions.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) - visual tokens and component
  families.
- [`docs/SECURE_LOGIN_GUIDEBOOK.md`](docs/SECURE_LOGIN_GUIDEBOOK.md) - the
  authentication and financial-data-protection guidebook for the not-yet-built
  login boundary.

## Getting Started

Requirements: Node.js 24 or newer, npm 11 or newer.

```bash
npm install
npm run dev
npm test
```

- Website: `http://127.0.0.1:4311`
- API: `http://127.0.0.1:4310`

The API creates an empty SQLite database outside the repository at
`~/.cashflow-calculator/data/cashflow.sqlite` by default
(`%USERPROFILE%\.cashflow-calculator\...` on Windows). Set `CASHFLOW_DATA_ROOT`
to use another external data directory. Set `CASHFLOW_OWNER_NAME` locally when
importing payment-service exports that identify the account owner by name.

Full setup, environment, and troubleshooting steps live in
[`RUNBOOK.md`](RUNBOOK.md).

## Privacy Boundary

- Personal records and generated financial artifacts must remain outside this
  repository.
- Both servers bind to `127.0.0.1` by default.
- No telemetry or external runtime service is used; there is no bank
  connectivity, and import is by owner-supplied CSV export only.
- Authentication and multi-user account isolation are **not** implemented.
  Keep the application loopback-only until they are.

## Working With Agents

The control docs are intentionally plain Markdown so they work with Codex,
Claude, or any other agent that reads repository instructions - no framework or
preprocessing required.

For **Claude Code**, keep the one-line `CLAUDE.md` containing exactly
`@AGENTS.md` so the rules load automatically; do not replace it with a generated
`/init` file. Other agents should be pointed at `AGENTS.md` as their entry
point.

Every completed ticket must leave proof in its final response and its owning
spec's append-only evidence log. Milestone specs additionally require a short
demo artifact (screenshot, recording, preview URL, or one-command demo) so work
is accepted on product truth, not passing tests alone.

No commit, remote change, or deployment happens without the user's explicit
authorization.

## Project Status

See [`TASKBOARD.md`](TASKBOARD.md) for active execution state and
[`BLUEPRINT.md`](BLUEPRINT.md) for the durable spec catalog.

## License

No license file is present; this repository is private and unlicensed for
redistribution.
