# Cashflow Calculator Agent Rules

## Scope

This repository contains the reusable Cashflow Calculator website. It must not contain personal financial records, account-specific seed data, generated financial reports, private catalogs, or owner-specific configuration.

## Privacy and security

- Keep runtime financial data outside the repository. The default location is `%USERPROFILE%\.cashflow-calculator`.
- Never read from the parent `Budgeting` data, output, workbook, or private-document folders unless the user explicitly requests that work.
- Never copy bank, payroll, payment-service, workbook, SQLite, CSV, PDF, report, or catalog data into this repository.
- Keep all servers bound to `127.0.0.1` until backend authentication and per-user authorization are implemented.
- Do not treat a frontend login page as a security boundary.
- Do not commit, push, publish, deploy, or change the remote without explicit user approval.

## Engineering workflow

- Preserve unrelated dirty work.
- Prefer the smallest correct change.
- Use red/green TDD for behavior changes.
- Validate inputs and handle errors explicitly.
- Do not claim a check passed unless it ran.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

The repository intentionally starts with an empty account database. Tests and fixtures must be synthetic.
