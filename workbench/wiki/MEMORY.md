---
type: memory
status: active
sensitivity: normal
knowledge_role: canonical
provenance:
  - Adoption of this room from LLM Workbench v3.1.1 on 2026-09-04
source_paths:
  - workbench/wiki
last_verified: 2026-09-04
---

# Cashflow Calculator Memory

> Generated from LLM Workbench v3.1.1. This is the room brain: the
> canonical, human-editable memory router for this project, kept at
> `workbench/wiki/MEMORY.md`. Start here and follow the smallest relevant
> link instead of browsing folders or searching.

This router holds durable room memory only: context, decision-history
pointers, and routing. It never duplicates live task state; it routes to it.

**Privacy note for this room:** everything this project touches at runtime is
personal financial data. Nothing derived from a real import - amounts,
merchants, account labels, balances, owner name - belongs in this wiki, in a
spec, or in any tracked file. Route to where the data lives; never quote it.

## Source Precedence

1. Verified runtime and this room's live controls: `AGENTS.md`, `BLUEPRINT.md`,
   the assigned stable spec, `TASKBOARD.md`, and `RUNBOOK.md`.
2. Maintained notes routed from this file.
3. `archive/` and generated material.

When sources disagree, verify the higher-authority source and repair the stale
note (`AGENTS.md` -> State Resolution). The wiki is a map, not a Governance
Plane: it routes to Canon, Grounding, and verified Actuality and authorizes
nothing.

## Leaving The Wiki

| Go to | For |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Authority, scope, the privacy boundary, safety, and the work loop |
| [BLUEPRINT.md](../../BLUEPRINT.md) | Product map, architecture, design decisions, and the spec catalog |
| [LEXICON.md](../../LEXICON.md) | Shared terms, the Governance Core, and design-concept routing |
| [TASKBOARD.md](../../TASKBOARD.md) | Current execution state |
| `workbench/specs/` | Stable capability records, acceptance, evidence, and proof |
| [RUNBOOK.md](../../RUNBOOK.md) | Exact operating and verification commands |
| [SCHEMA.md](SCHEMA.md) | Wiki CRUD, metadata, sensitivity, and freshness rules |
| [design-concepts/](design-concepts/README.md) | Owner-directed articles explaining durable design models |
| [guidebooks/](guidebooks/) | Ordered procedures that outgrew the Runbook |

## Routing

| Question | Read first |
|---|---|
| What does a field, metric, category, or period status mean? | [`docs/DATA_DICTIONARY.md`](../../docs/DATA_DICTIONARY.md) |
| What are the shared terms - cash window, treatment, fingerprint, scenario? | [LEXICON.md](../../LEXICON.md) -> Project Terms |
| What colors, type, and component families does the UI use? | [`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md) |
| How should the not-yet-built login and data-protection boundary work? | [`docs/SECURE_LOGIN_GUIDEBOOK.md`](../../docs/SECURE_LOGIN_GUIDEBOOK.md) |
| Where does the database live, and how do I back it up? | [RUNBOOK.md](../../RUNBOOK.md) -> Data Operations |
| Why pay-period windows instead of calendar months? | [BLUEPRINT.md](../../BLUEPRINT.md) -> Design Decisions |

Add a row only when a durable note exists to route to. Grow flat notes beside
this router and inside the declared collections; only `archive/` may nest.

## Up-Link

Standalone room; no deployment wiki.
