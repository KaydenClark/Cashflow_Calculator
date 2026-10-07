# Cashflow Calculator - Hot Taskboard

> Generated from LLM Workbench v3.1.1.

**Current focus:** Workbench adoption is complete (S-001). Nothing is claimed; S-002 waits on one owner decision before a slice can be activated.
**Owner:** Kayden Clark (executive owner; execution owner)
**Last updated:** 2026-09-04

This is an active execution projection, not a requirements store or proof
archive. Use `node workbench/tools/spec-workbench.mjs next --json` to select
work and load only its linked spec. Commands live in `RUNBOOK.md`.

## Active Specs

<!-- hot-specs:start -->
| Spec | Current slice | Owner | Blocker | Latest meaningful event | Next gate |
|---|---|---|---|---|---|
| none | No active slice | unassigned | none | All completed specs are cold. | Activate a planned spec explicitly. |
<!-- hot-specs:end -->

Completed specs disappear from this projection immediately. Their requirements,
decisions, acceptance, proof, completion, and supersession remain in the stable
spec linked from `BLUEPRINT.md`.

## Owner Decisions

Only decisions blocking an active spec appear here. Put options,
recommendation, cost/impact, owner, and next gate in one concise row; move the
resolved result into the owning spec.

| Spec | Decision | Options | Recommendation | Cost / impact | Owner | Next gate |
|---|---|---|---|---|---|---|
| [S-002](workbench/specs/S-002-backend-authentication/SPEC.md) | How far should the auth boundary go before any slice starts? | A: single-user hardening (one local credential, server-enforced, no schema change) / B: multi-user isolation (user table plus ownership on every financial table) | A, unless a second person will actually use this instance | A: days, low regression risk, reversible. B: rewrites the whole data layer for a user who does not exist yet | Kayden Clark | Owner picks A or B; then TK-001 unblocks and S-002 activates |
