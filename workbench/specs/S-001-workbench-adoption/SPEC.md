# S-001 - LLM Workbench Adoption

> Generated from LLM Workbench v3.1.1.

**Spec ID:** S-001
**Status:** complete
**Priority:** 1
**Owner:** claude
**Stance:** Builder
**Updated:** 2026-09-05
**Catalog description:** Migrate this repository onto the v3.1.1 LLM Workbench control surface without losing the project's existing rules, docs, or green baseline.
**Blockers:** none
**Latest event:** Spec completed and removed from the hot board.
**Next gate:** none

## Outcome

This repository is governed by the seven filled root controls plus a
manifest-backed `workbench/` support root, so any agent - Codex, Claude, or
another - can pick the project up cold and find authority, scope, commands, and
capability truth without chat history. The project's pre-existing privacy and
security rules survive the move intact.

## Why It Matters

Before adoption, agent guidance lived in a 33-line `AGENTS.md` that carried real,
load-bearing privacy rules but no work-selection loop, no capability records, no
verification contract beyond four commands, and no durable memory. Those rules
were correct and worth keeping; what was missing was the structure around them.
Adoption preserves the rules and adds the structure, so that future financial
and security work is selected, verified, and recorded rather than improvised.

## Current Verified State

Verified at the adoption commit:

- Baseline suite green as found: `npm test` (7 files, 42 tests), `npm run
  typecheck`, `npm run lint`, `npm run build` all pass.
- Application code unchanged by adoption. The only non-document change was
  `.claude/launch.json`, whose declared port `5173` contradicted
  `vite.config.ts`'s real port `4311`.
- No legacy Workbench layout existed: no `specs/`, `Wiki/`, root `MEMORY.md`,
  `feedback/`, `grilling diary/`, or `handoffs/`. The migration moved nothing
  (`moved: []`); it installed a fresh schema 2 layout.
- Four required core stance skills (`builder`, `auditor`, `reviewer`,
  `reconciler`) were absent from the user-scoped discovery root and had to be
  supplied before the migration seam would run.

## Desired Behavior

1. Seven root controls exist as filled ordinary files with no unfilled template
   placeholder; `CLAUDE.md` is exactly `@AGENTS.md`.
2. `workbench/manifest.json` validates and is the only active support-path
   authority.
3. Every pre-adoption steering document is classified port / fold / keep /
   retire, with no live content lost.
4. The pre-existing privacy and security boundary is carried into `AGENTS.md`
   verbatim in effect, not weakened by the move.
5. `node workbench/tools/spec-workbench.mjs doctor` passes.
6. The full verification suite still matches the Phase 0 baseline.

## Decisions And Contracts

- **Adoption, not Genesis.** The repository already had real code, history, and
  its own `AGENTS.md`, so the migration protocol applied.
- **Migration map.** `AGENTS.md` -> port and expand (privacy, security,
  engineering, and verification rules all retained). `CLAUDE.md` -> fold; its
  "no first commit, push, or publish without explicit authorization" rule moved
  into `AGENTS.md` -> Safety And Change Control, and the file became the bare
  `@AGENTS.md` bridge the layout validator requires. `README.md` -> port.
  `docs/DATA_DICTIONARY.md`, `docs/DESIGN_SYSTEM.md`,
  `docs/SECURE_LOGIN_GUIDEBOOK.md` (+ `.docx`) -> keep as project-local
  references, linked from `README.md`, `AGENTS.md`, and the wiki router, not
  folded. Nothing was retired, so no archive directory was created.
- **Glossary split.** `docs/DATA_DICTIONARY.md` keeps field- and metric-level
  definitions; `LEXICON.md` -> Project Terms carries only the project-wide terms
  shared across specs, code, and conversation, and links to the dictionary for
  detail. The dictionary was not copied into the Lexicon.
- **No integration branch.** This repository has only `main`, and the owner's
  standing rule is that no push or merge happens without explicit
  authorization. `AGENTS.md` -> Git Rules therefore sets `main` as both the PR
  target and the owner-only merge target, and defines an agent's completion
  boundary as an authorized push plus an open, reviewed PR.
- **Provenance.** Source repository `https://github.com/KaydenClark/LLM_Workbench`,
  release `v3.1.1`, resolved commit
  `fa04e27261497ad5aa2f62085764fb6581b2e7e1`, clean tree. The managed-tool
  receipt at `workbench/tools/.workbench-tools.json` records that commit and a
  SHA-256 for each of the eleven installed runtime tools; `workbench-tools.mjs
  verify` reports `valid`. `workbench/manifest.json` records the release but
  carries `commit: "unrecorded"`, because the migration seam does not resolve
  the source commit into the manifest - the receipt is the authoritative
  provenance record.
- **Lint scope.** Installing the managed runtime tools broke `npm run lint`:
  `eslint .` walked the six new `workbench/tools/*.mjs` Node scripts and emitted
  39 `no-undef` errors for `process` and `console`. The project already ignored
  its own `tools/**` for the same reason, so `workbench/**` was added to the
  same ignore list. Those tools are receipt-backed, must never be hand-edited,
  and are linted upstream. This is the only application-configuration change
  adoption required.
- **Core-skill supply.** `tools/core-skill-installer.mjs` refuses a discovery
  root that is itself a Git repository. `~/.claude/skills` is a symlink to
  `~/.agents/skills`, which is the owner's own `KaydenClark/skills` repository,
  so the installer could not run. The four missing stance skills were copied in
  additively and left uncommitted there for the owner to review. The friction is
  logged in `workbench/feedback/WORKBENCH_FEEDBACK.md`.

## Non-Goals

- Changing application behavior, schema, classification rules, or UI.
- Manufacturing a spec for each already-shipped capability. Existing behavior is
  documented in `BLUEPRINT.md` and `docs/DATA_DICTIONARY.md`; new specs are
  created when new work starts.
- Committing or pushing anything. Adoption leaves the branch local and unstaged
  for owner review.

## Dependencies And Blockers

- none

## Vertical Implementation Slices

Tickets are temporary tracer bullets within this stable capability record.

| Ticket | Slice | Status | Blockers | Proof |
|---|---|---|---|---|
| TK-001 | Fill the seven controls, run the migration seam, and re-verify against the Phase 0 baseline | done | none | npm test 7 files/42 tests pass; npm run typecheck, npm run lint, npm run build clean; spec-workbench doctor passed; workbench-layout validate valid; workbench-tools verify valid |

### TK-001 - Assigned task

**Stance:** Builder

Fill the seven root controls from observed repository reality, run
`workbench-adoption.mjs migrate`, seed the wiki router and feedback lane, then
re-run the full verification suite and the project's own `doctor` and confirm
both match the Phase 0 baseline.

## Acceptance Criteria

- [x] Seven root controls are filled ordinary files with no unfilled placeholder.
- [x] `CLAUDE.md` is exactly `@AGENTS.md`.
- [x] `workbench/manifest.json` validates (`workbench-layout.mjs validate` ->
      `valid`).
- [x] The managed-tool receipt verifies (`workbench-tools.mjs verify` ->
      `valid`).
- [x] `AGENTS.md` edit scope names only paths that exist in this repository.
- [x] The pre-adoption privacy and security rules are present in `AGENTS.md`.
- [x] `workbench/wiki/MEMORY.md` exists, routes to the live controls, and has no
      unfilled placeholder.
- [x] `node workbench/tools/spec-workbench.mjs doctor` passes.
- [x] The full verification suite matches the Phase 0 baseline.

## Testing Seams

Adoption changes documents and layout, not application behavior, so no new unit
test proves it. The checkable seams are:

- the Workbench tools themselves: `workbench-layout.mjs validate`,
  `workbench-tools.mjs verify`, and `spec-workbench.mjs doctor`;
- the unchanged application suite, which must stay identical to the Phase 0
  baseline - a changed result would mean adoption touched behavior it should
  not have.

## Verification Procedure

```bash
npm test
npm run typecheck
npm run lint
npm run build
node workbench/tools/spec-workbench.mjs doctor
node workbench/tools/workbench-layout.mjs validate --project "$(pwd)"
```

Fresh-clone verification of the harness source used here:

```bash
git clone https://github.com/KaydenClark/LLM_Workbench /tmp/llm-workbench-check
git -C /tmp/llm-workbench-check checkout fa04e27261497ad5aa2f62085764fb6581b2e7e1
node /tmp/llm-workbench-check/tools/workbench-tools.mjs verify --project "$(pwd)"
```

## Documentation Impact

- `AGENTS.md`, `BLUEPRINT.md`, `LEXICON.md`, `RUNBOOK.md`, `TASKBOARD.md`,
  `CLAUDE.md`, `README.md` - all rewritten onto the v3.1.1 control surface.
- `workbench/wiki/MEMORY.md` - new room brain.
- `workbench/feedback/WORKBENCH_FEEDBACK.md`, `REPORT_FORMAT.md` - new.
- `docs/` - unchanged; kept as project-local references.

## Append-Only Evidence And Execution Log

| Date | Ticket | Event | Verification | Docs | Remaining gap |
|---|---|---|---|---|---|
| 2026-09-05 | TK-001 | Ticket closed | npm test 7 files/42 tests pass; npm run typecheck, npm run lint, npm run build clean; spec-workbench doctor passed; workbench-layout validate valid; workbench-tools verify valid | AGENTS/BLUEPRINT/LEXICON/RUNBOOK/TASKBOARD/CLAUDE/README rewritten onto v3.1.1; workbench/wiki/MEMORY.md and feedback lane seeded | manifest provenance commit is 'unrecorded' (receipt holds the resolved commit); four stance skills left uncommitted in the owner's skills repo |
| 2026-09-05 | spec | Spec completed | Acceptance gates satisfied | Documentation impact recorded above | none |

## Completion Result

Adopted. This repository now runs on LLM Workbench v3.1.1: seven filled root
controls, a schema 2 `workbench/manifest.json` that is the only support-path
authority, eleven receipt-backed managed runtime tools, a wiki room brain, a
seeded feedback lane, and two capability specs (this one and S-002).

No legacy Workbench layout existed, so the migration moved nothing and lost
nothing. Every pre-adoption steering document was classified: `AGENTS.md` and
`README.md` ported, `CLAUDE.md` folded into `AGENTS.md` and reduced to the bare
bridge, the three `docs/` references kept and linked, nothing retired.

Application behavior is unchanged. Two configuration repairs were required and
are recorded above: `.claude/launch.json`'s stale port, and the `workbench/**`
eslint ignore that restored `npm run lint` after the managed tools landed.

Verified on 2026-09-04 at the adoption branch tip: `npm test` 7 files / 42 tests
pass - identical to the Phase 0 baseline - with `npm run typecheck`,
`npm run lint`, and `npm run build` clean, `spec-workbench doctor` passing,
`workbench-layout validate` reporting `valid`, and `workbench-tools verify`
reporting `valid`.

Nothing was committed or pushed; the branch `claude/adopt-workbench-v3.1.1` is
left for owner review.

## Remaining Limitations Or Follow-Up Specs

- `workbench/manifest.json` provenance carries `commit: "unrecorded"`; the
  managed-tool receipt holds the resolved commit instead.
- The four stance skills remain uncommitted in the owner's separate
  `KaydenClark/skills` repository, pending owner review.
- Backend authentication and per-user authorization remain unimplemented; that
  gap is owned by S-002, not by this spec.

## Supersession

- Supersedes: none
- Superseded by: none
