# Cashflow Calculator

Cashflow Calculator is a local-first React and SQLite website for importing financial records, reviewing cash flow, and exploring forecasts.

The repository contains application code only. It does not include personal financial records, private seed files, generated reports, or account-specific configuration.

## Setup

Requirements:

- Node.js 24 or newer
- npm 11 or newer

```powershell
npm install
npm run dev
```

- Website: `http://127.0.0.1:4311`
- API: `http://127.0.0.1:4310`

The API creates an empty SQLite database outside the repository at `%USERPROFILE%\.cashflow-calculator\data\cashflow.sqlite` by default. Set `CASHFLOW_DATA_ROOT` to use another external data directory. Set `CASHFLOW_OWNER_NAME` locally when importing payment-service exports that identify the account owner by name.

## Privacy boundary

- Personal records and generated financial artifacts must remain outside this repository.
- The server binds to `127.0.0.1` by default.
- No telemetry or external runtime service is used.
- Authentication and multi-user account isolation are not implemented yet. Keep the application loopback-only.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

No commit, remote change, or deployment is performed automatically.
