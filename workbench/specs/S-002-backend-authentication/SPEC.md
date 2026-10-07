# S-002 - Backend Authentication And Per-User Authorization

> Generated from LLM Workbench v3.1.1.

**Spec ID:** S-002
**Status:** planned
**Priority:** 2
**Owner:** Kayden Clark
**Stance:** Builder
**Updated:** 2026-09-04
**Catalog description:** Replace the loopback binding as the only access boundary with real backend authentication and per-user authorization over financial data.
**Blockers:** none
**Latest event:** Gap captured during Workbench adoption; not started.
**Next gate:** Owner decides single-user hardening versus multi-user isolation before any slice is activated.

## Outcome

Access to a person's financial data is controlled by an authenticated,
authorized backend rather than by the fact that the server only listens on
`127.0.0.1`. Until then this remains the project's single largest known
security gap, and it is recorded here rather than left implicit.

## Why It Matters

Today the only thing preventing another user or process from reading every
transaction, statement, and forecast is the loopback binding. `README.md`,
`AGENTS.md`, and `docs/SECURE_LOGIN_GUIDEBOOK.md` all state that a frontend
login page is not a security boundary and that the application must stay
loopback-only until this exists. That constraint is correct but limiting: it
blocks any use from another device on the owner's own network, and it means a
misconfiguration - a changed host, a tunnel, a proxy - silently removes the only
protection the data has.

## Current Verified State

- `src/server/index.ts` binds `127.0.0.1` and disables `x-powered-by`. There is
  no authentication middleware, no session, no token check, and no per-row
  ownership column anywhere in `src/server/database.ts`.
- Every API route (`/api/health`, `/api/state`, `/api/assumptions/:key`,
  `/api/transactions/:fingerprint/classification`,
  `/api/forecast/recalculate`, `/api/import/preview`, `/api/import/commit`) is
  reachable without a credential.
- The schema has no user, account-owner, or tenant concept: `transactions`,
  `pay_statements`, `assumptions`, and the rest are implicitly single-owner.
- `docs/SECURE_LOGIN_GUIDEBOOK.md` exists and describes the intended login and
  financial-data-protection approach. It is owner-authored reference material,
  not an accepted implementation plan.

## Desired Behavior

Deliberately left as an outcome, not a design, until the owner decision below is
made. Whatever shape is chosen must satisfy:

1. No API route returns or mutates financial data without an authenticated
   principal.
2. A frontend login screen is never the enforcement point; the server rejects
   unauthenticated requests on its own.
3. Credentials are never stored in this repository, in the SQLite file in
   recoverable form, or in any log.
4. The existing loopback default is not relaxed by this work alone; changing the
   binding is a separate, explicit decision that depends on this one.

## Decisions And Contracts

- Read `docs/SECURE_LOGIN_GUIDEBOOK.md` before proposing a design, and reconcile
  any conflict between it and this spec explicitly rather than silently picking
  one.
- Any schema change adding ownership to existing tables is review-required under
  `AGENTS.md` -> Edit Scope, and needs a migration that cannot orphan existing
  rows.

## Non-Goals

- Hosting, public deployment, or exposing the app beyond the local machine. Even
  with authentication, that is a separate decision.
- Third-party identity providers or any external runtime service, which would
  contradict `BLUEPRINT.md` -> Non-Goals.

## Dependencies And Blockers

- Blocked on an owner decision (see below) before any slice is activated.

## Owner Decision Required

| Options | Recommendation | Cost / impact |
|---|---|---|
| **A. Single-user hardening:** one local credential, server-enforced session, no schema change. **B. Multi-user isolation:** user table, ownership column on every financial table, per-user queries throughout. | **A**, unless the owner actually intends more than one person to use this instance. A is a small, contained change that removes the "loopback is the only boundary" risk. B rewrites every query in `src/server/analytics.ts` and every table in `src/server/database.ts` to serve a second user who does not exist yet. | A: days, low regression risk, reversible. B: substantially larger, touches the whole data layer, and is hard to unwind. |

## Vertical Implementation Slices

No slice is activated until the decision above is made; the ticket below is a
placeholder for the first tracer bullet under whichever option is chosen.

| Ticket | Slice | Status | Blockers | Proof |
|---|---|---|---|---|
| TK-001 | Reject an unauthenticated request to one read route end to end, with a failing test first | blocked | owner-decision | pending |

### TK-001 - Assigned task

**Stance:** Builder

Once the option is chosen: pick one read route, write a failing supertest case
asserting an unauthenticated request is rejected, then implement the smallest
server-side check that turns it green. Do not start with the login UI.

## Acceptance Criteria

- [ ] An unauthenticated request to every financial route is rejected by the
      server, proven by test.
- [ ] No credential material is committed, logged, or stored recoverably.
- [ ] The loopback default is unchanged by this spec.
- [ ] `docs/SECURE_LOGIN_GUIDEBOOK.md` and `README.md` are reconciled with what
      was actually built.

## Testing Seams

- The Express app object in `src/server/index.ts`, exercised through supertest
  as `tests/database.integration.test.ts` already does - this is where an
  unauthenticated request can be asserted to fail.

## Verification Procedure

```bash
npx vitest run tests/database.integration.test.ts
npm test
npm run typecheck
npm run lint
npm run build
node workbench/tools/spec-workbench.mjs doctor
```

## Documentation Impact

- `README.md` -> Privacy Boundary and `AGENTS.md` -> Privacy And Security
  Boundary both currently state that authentication does not exist. Both must be
  updated when it does.
- `BLUEPRINT.md` -> Cross-Cutting Architecture And Invariants records the
  loopback binding as the only access boundary; that row changes with this work.

## Append-Only Evidence And Execution Log

| Date | Ticket | Event | Verification | Docs | Remaining gap |
|---|---|---|---|---|---|

## Completion Result

Pending.

## Remaining Limitations Or Follow-Up Specs

- Relaxing the `127.0.0.1` binding is deliberately out of scope and would need
  its own spec after this one lands.

## Supersession

- Supersedes: none
- Superseded by: none
