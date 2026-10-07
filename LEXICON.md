# Cashflow Calculator - Lexicon

> Generated from LLM Workbench v3.1.1.

**Last reviewed:** 2026-09-04
**Status:** active

This is the canonical lookup table for terms whose meaning is shared across the
project. Read it when a request, spec, test, or skill uses project language that
could be ambiguous.

## Task Routing

The ordinary entry route is `AGENTS.md` -> `RUNBOOK.md` -> `LEXICON.md`.
Continue to the assigned `SPEC.md` resolved through `workbench/manifest.json`.
Use `BLUEPRINT.md` for architecture and cross-cutting direction; use the
manifest-declared Wiki `MEMORY.md` for task-relevant durable knowledge and the
ADR `REGISTER.md` for decision rationale. Read only the relevant linked owners.
`TASKBOARD.md` is a dashboard, not a prerequisite reading archive.

## Ownership Rules

- Add a term only after the parties agree on its meaning.
- Put project-wide definitions here; keep capability-specific terms in the
  owning spec until they become shared.
- Definitions belong here. Requirements and decisions remain in
  `BLUEPRINT.md` or the owning `SPEC.md`.
- Surface conflicts before changing an established definition.
- Link to detailed sources instead of copying them here.

## Workbench Terms

| Term | Definition | Distinction |
|---|---|---|
| **Design concept** | The shared understanding between the parties working on a project about what that project is. | It exists between participants. `BLUEPRINT.md` helps them reconstruct it but is not itself the design concept. |
| **Blueprint** | The compact project artifact that records product direction, principles, cross-cutting architecture, invariants, and non-goals. | It supports the design concept; it is not a PRD, work queue, glossary, or proof archive. |
| **Lexicon** | The canonical lookup table for definitions shared across the project. | It owns meanings, not requirements, implementation decisions, or work status. |
| **Spec** | A stable capability record containing scoped intent, requirements, decisions, implementation slices, acceptance, verification, evidence, and completion. | It combines the useful product and engineering roles often split between a PRD and technical spec. |
| **Ticket** | A temporary, one-context tracer-bullet slice inside a spec that produces independently verifiable progress. | It is execution structure, not durable capability history. |

## Stance Terms

| Term | Definition | Distinction |
|---|---|---|
| **Stance** | The method and obligations for performing one assigned task within already established authority. | It is neither an identity nor an authority grant; switching stance creates no handoff. |
| **Builder** | The stance that delivers a scoped, verified result and maintains its documentation. | Implementation includes relevant review and verification. |
| **Auditor** | The stance that checks claims against named evidence and reports a bounded verdict. | An audit does not authorize repairs or release. |
| **Reviewer** | The stance that challenges a candidate's correctness, impact and evidence. | At integration it runs in a separate context; it does not quietly repair the candidate. |
| **Reconciler** | The stance that reconciles achieved work with the state and owners needed for continuation. | It neither manufactures completion nor duplicates truth in a universal handoff. |
| **TASK** | The assigned ticket within a stable SPEC, carrying its normal stance assignment. | No additional task file or queue is introduced. |

## Governance Core

Design-concept routing: a question about what a product, subsystem, or
relationship *is* starts here, then follows the term to the owner-directed
articles in `workbench/wiki/design-concepts/`; the Blueprint and the assigned
spec still decide when a requirement or verified Actuality matters.

Shared by every Workbench. These rows describe roles and boundaries; the
binding behavior lives in `AGENTS.md`, cross-cutting architecture in
`BLUEPRINT.md`, and rationale in the project's `workbench/docs/adr/` collection.

| Term | Definition | Distinction |
|---|---|---|
| **Governance Plane** | The role one claim plays in one operation: **Intent** (the request), **Canon** (the binding current-state rule), **Grounding** (evidence about intended truth or whether work was done correctly), **Enduring Context** (durable reference consulted), **Actuality** (the target being changed, including files, source, runtime, and verified state), and **Projection** (a source-derived report). | Planes classify claims and their use, never whole files, directories, or artifact types. One assigned spec carries Canon, Projection, Grounding, and Enduring Context claims at once. |
| **Workbench Contract** | The logical set of current claims owned by the seven root controls plus the explicitly assigned spec. | It is not a file; no `CONTRACT.md` or other coequal root control exists. |
| **Instruction authority** | What an agent may do: the current owner request, then `AGENTS.md` with platform safety, then the explicitly assigned spec as a bounded capability delegate, then the procedural controls. | An assigned spec cannot enlarge the request, platform safety, or `AGENTS.md` scope; an unassigned spec is evidence. |
| **State resolution** | How a Canon claim and verified Actuality are reconciled: newer Canon is an implementation gap, newer verified Actuality is documentation drift, unclear ordering is an ambiguity to investigate. | Neither "code always wins" nor "Canon proves implementation"; the touched owner is repaired rather than a universal precedence applied. |
| **No-governance-tax rule** | Ordinary owner-directed project work requires only the Workbench Contract and its verification; no coordination system, order form, flight, or external mechanism is a prerequisite. | Available mechanisms a change genuinely needs still apply; the line is availability, not ceremony. |
| **Diagnostic** | A registered finding a Workbench tool emits with a stable code, a severity of `error` or `attention`, a scope, and a blocking effect of `all`, `selection`, `selected-slice`, or `none`. | The consuming command enforces the effect; no artifact chooses whether its own finding blocks. |
| **Support lane** | One of the six manifest-declared slots under lowercase `workbench/`: `docs`, `specs`, `wiki`, `sessions`, `feedback`, `tools`. | A lane is a structural slot, not a plane; the count coincides with the six planes by accident. |
| **Collection** | A manifest-declared, machine-used directory inside a lane: `docs/adr`, `wiki/design-concepts`, `wiki/guidebooks`, `wiki/archive`, `sessions/grilling`, `sessions/handoffs`, `sessions/checkpoints`. | Collections are flat and lowercase; a collection is never promoted to a lane because its contents differ in kind. |
| **ADR** | An architecture decision record in `workbench/docs/adr/`: title, decision, considered alternatives, consequences, provenance, and frontmatter naming the control that carries its rule. | An ADR owns rationale; the rule is binding only where `canonicalized_in` points. |
| **Checkpoint** | A privacy-checked, tracked copy of a live session record promoted into `sessions/checkpoints/`. | Live grilling and handoff records are untracked; an untracked path is not durable evidence. |
| **Design Concept article** | An owner-authorized, encyclopedic wiki article in `wiki/design-concepts/` explaining one durable cross-cutting design model, ending with `Evidence and Sources` and carrying `History`. | It documents a design concept; it is not the Blueprint, an ADR, a procedure, or task state, and agents suggest or repair it but do not create it. |
| **Wiki profile** | The manifest's declared wiki shape: `project` (one room's memory router and collections) or `deployment` (adds owner, machine, and project pointer collections). | A profile declares routing shape; it grants no authority and copies no live task state. |
| **Managed runtime tool** | A file in `workbench/tools/` installed from the Workbench release and listed in the tools receipt with its source release, commit, and hash. | It is updated only by explicit update with backup and rollback; an application's root `tools/` is application-owned. |

## Project Terms

Field-level column and metric definitions live in
[`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md); this table owns the terms
that are shared across specs, code, and conversation.

| Term | Definition | Distinction / aliases to avoid |
|---|---|---|
| **Cash window** | The span from one paycheck's pay date to the day before the next paycheck's pay date, used as the primary reporting period. | Not a calendar month and not the payroll period the statement covers; say "cash window", not "pay cycle" or "month". |
| **Pay statement** | A source-derived payroll record carrying pay date, the period it covers, and net pay in cents. | It supplies the window boundary and net inflow; it is not itself a transaction. |
| **Period status** | Whether a cash window is `Actual`, `Provisional`, or `Forecast`, based on payroll presence and spending-source coverage. | A `Provisional` window is real but incompletely covered; it is not a forecast and is excluded from forecast training by default. |
| **Inflow** | Net paycheck cash plus genuine external income received inside the cash window. | Excludes internal transfers, duplicated payroll deposits, advances already represented in payroll, investment principal, and savings movement. Not "deposits". |
| **Outflow** | Genuine cash expense inside the window, with merchant refunds reducing their own category. | Savings transfers are not outflow. Not "spending total" when savings movement is included. |
| **Margin** | `Inflow - Outflow` for a period, in cents. | A planning result, not a bank balance and not a reconciliation. |
| **Treatment** | Whether a normalized transaction is `included`, `excluded`, or `unresolved` for period math. | Distinct from category: an included transaction still needs a category, and an excluded one still needs an exclusion reason. |
| **Chosen category** | The evidence-based spending category used in reporting, drawn from the fixed `SPENDING_CATEGORIES` list. | Not the source export's own label, which is retained separately as "original category". |
| **Needs Review** | The category assigned when no rule classifies a transaction confidently. | A visible unknown, not a miscellaneous bucket; it exists to be resolved, not to absorb leftovers. |
| **Classification override** | An owner correction of a transaction's category, keyed by fingerprint so it survives re-import. | It outranks rule output; it is not a rule change and does not reclassify similar transactions. |
| **Fingerprint** | The SHA-256 content key over normalized source, account, timestamp, signed cents, description, and usable external id, used to deduplicate. | Not the source's own transaction id, which may be absent or unstable across exports. |
| **Fixed commitment** | A known amount scheduled once per month and removed from the variable baseline before forecasting. | Not simply a recurring merchant; it is a scheduled obligation the forecast treats separately. |
| **Variable baseline** | Daily-normalized spending history built from complete periods only. | Not an average of all periods; incomplete coverage is excluded rather than diluted. |
| **Scenario** | A `base`, `lower`, or `higher` multiplier applied to variable categories only. | Fixed commitments never move with the scenario; a scenario is not a separate saved plan. |
| **Coverage confidence** | The month-to-date view's own report of whether its sources cover the span: `complete`, `partial`, or `none`. | It describes the data behind the number, not the accuracy of the arithmetic. |
| **Data root** | The external directory holding the SQLite database and any runtime financial data, defaulting to `~/.cashflow-calculator`. | Never inside this repository; not the same as the repository root, and not a fixture location. |
