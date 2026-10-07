# Cashflow Calculator - Workbench Feedback

> Generated from LLM Workbench v3.1.1. Lives at
> `workbench/feedback/WORKBENCH_FEEDBACK.md`; see `RUNBOOK.md` -> Upgrading
> The Harness.

This is the return channel from this project back to the LLM Workbench harness.
When the control docs themselves (`AGENTS.md`, `BLUEPRINT.md`, `LEXICON.md`,
`TASKBOARD.md`, `RUNBOOK.md`, `GENESIS.md`) are unclear, wrong, missing guidance, or actively
slow the work down, record it here instead of silently working around it. The
owner carries these lessons back to LLM Workbench, where a change is validated
against `evals/` before it ships as "better".

This log is append-only. Do not edit or delete prior rows; add a new one.

## How To Log

Add a row whenever the harness (not this project's own code or docs) caused
friction or could be improved. Keep it concrete: name the doc and section, say
what happened, and propose a change if you have one.

| Date | Doc / section | What happened | Impact | Proposed change | Status |
|---|---|---|---|---|---|
| 2026-09-04 | `tools/core-skill-installer.mjs` -> discovery root check | Adoption requires the 16 core skills in a user-scoped discovery root, but the installer refuses any root that is itself a Git repository (`foreign-git-root`). A user who keeps their skills in a versioned repo and symlinks `~/.claude/skills` to it cannot run the installer at all, even though the operation is purely additive. The four stance skills had to be copied in by hand to unblock adoption. | medium - blocked the documented Phase 7 command; workaround was obvious but undocumented | Allow a clean Git-owned discovery root when every skill to be written is new, or document the hand-copy fallback in `ADOPTION.md` Phase 7. | new |

Status values: `new` (just logged) -> `sent` (carried back to LLM Workbench) ->
`landed` (a harness change shipped) or `declined` (kept as-is, with a reason).

## What Belongs Here vs. TASKBOARD

- This project's own work, bugs, and tasks -> `TASKBOARD.md`.
- Problems with the *harness rules themselves* -> here.

If a harness problem is also blocking this project right now, log it here **and**
open a `TASKBOARD.md` task for the local workaround, linking the two.
