# Cashflow data dictionary

All money is stored as integer USD cents and rounded only for display. Dates are stored as ISO `YYYY-MM-DD` and displayed in the local `America/Denver` context.

## Period metrics

| Metric | Definition |
| --- | --- |
| Inflow | Net paycheck cash plus genuine external income received inside the paycheck cash window. Internal transfers, duplicated payroll deposits, DailyPay advances represented in payroll, investment principal, and savings movements are excluded. |
| Net paycheck | Source-derived payroll net pay for the paycheck that starts the cash window. |
| Other inflow | Genuine external receipts such as Venmo receipts, refunds treated as income only when they are not merchant refunds, dividends, and other income. |
| Outflow | Genuine cash expenses in the window, including recovered Auto Loan credits counted once. Savings transfers are excluded. Merchant refunds reduce their expense category. |
| Margin $ | `Inflow - Outflow`. |
| Outflow % | `Outflow / Inflow`. Displays `N/A` when inflow is zero. |
| Margin % | `Margin / Inflow`, equivalent to `1 - Outflow %`. Displays `N/A` when inflow is zero. |
| Category % of inflow | Category outflow divided by period inflow. |
| Category % of outflow | Category outflow divided by total period outflow. |
| Cumulative margin | Running sum of period margins. This is a planning result, not a bank-balance reconciliation. |
| Budget variance | Window-scaled Budget Calculator target less actual outflow. Positive is under budget. |
| Forecast variance | Actual outflow compared with the active forecast when both values exist. |

## Period status

| Status | Meaning |
| --- | --- |
| Actual | Payroll for the paycheck is present, a following paycheck defines the cash-window end, and spending sources cover that full window. |
| Provisional | The cash window has mixed or incomplete required-source coverage. Excluded from forecast training by default. |
| Forecast | A future editable schedule generated from the last verified semi-monthly cadence. |

## Classification fields

| Field | Meaning |
| --- | --- |
| Original category | Category exactly as supplied by the source export. |
| Chosen category | Evidence-based spending category used in reporting. |
| Classification rule | User override, exact merchant mapping, keyword rule, source mapping, or `fallback:needs_review`. |
| Confidence | Deterministic rule confidence from 0 to 1. |
| Review required | Ambiguous or fallback classification requiring user confirmation. |
| Treatment | `included`, `excluded`, or `unresolved`. |
| Exclusion reason | Human-readable reason an ignored row cannot affect inflow, outflow, or margin. |
| Fingerprint | SHA-256 of normalized source type, account label, transaction date/time, signed cents, description, and usable external identifier. |

## Forecast fields

| Field | Meaning |
| --- | --- |
| Fixed commitment | Known amount scheduled once per month and removed from the variable baseline. |
| Variable baseline | Daily-normalized history from complete periods only. |
| Forecast method | Lowest-backtest-error transparent candidate: trailing median, recency-weighted average, or same-calendar-month average. |
| Backtest error | Mean absolute percentage-like error on recent held-out complete periods, with a small denominator floor for stability. |
| Low / high range | Base outflow plus or minus average recent residual error. It is an uncertainty range, not a guarantee. |
| Scenario | Base, lower-spend, or higher-spend variable-category multiplier. Fixed commitments are unchanged. |

## Canonical spending categories

Rent & Housing; Car Payment; Auto Insurance; Fuel; Vehicle Maintenance & Registration; Installment & Debt Payments; Restaurants & Fast Food; Groceries; General Retail & Household; Electronics & Tech; Tabletop Games & Miniatures; Video Games & Game Services; Movies, Events & Recreation; Streaming, Music & Audiobooks; AI, Software & Web Services; Adult Content & Products; Vape & Nicotine; Cannabis & Medicinal Products; Alcohol & Bars; Pet Care & Aquatics; Healthcare & Pharmacy; Home & Garage; Personal Care; Gifts & Personal Support; Travel & Camping; Taxes & Government; Banking Fees; Cash Withdrawals; Needs Review.

Legacy source labels such as `Percriptions`, `Shopping`, and `Hobbies` are retained only as source evidence and mapped to the narrower category supported by the merchant or description. `Savings` remains a planning result or goal allocation, not a spending category.

Runtime transaction records, source exports, and generated reports are intentionally stored outside this repository and must never be committed.
