import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "../DataContext";
import { Money, Ratio, shortDate } from "../components/Format";
import { StatusMark } from "../components/StatusMark";
import { PageState } from "./Overview";

type Filter = "Combined" | "Actual" | "Forecast";

export default function PayPeriods() {
  const { state, loading, error } = useData();
  const [filter, setFilter] = useState<Filter>("Combined");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string>();
  const periods = useMemo(() => state?.periods.filter((period) => (filter === "Combined" || period.status === filter) && `${period.payDate} ${period.windowStart} ${period.windowEnd}`.includes(search)) ?? [], [state, filter, search]);
  if (loading && !state) return <PageState title="Loading pay periods…" />;
  if (error || !state) return <PageState title={error || "Pay periods are unavailable"} error />;
  return <div className="page table-page">
    <header className="page-header"><div><h1>Pay Period P&L</h1><p>Every paycheck cash window, reconciled to its categories and underlying transactions.</p></div></header>
    <div className="toolbar"><div className="segmented" aria-label="Period filter">{(["Combined", "Actual", "Forecast"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "Combined" ? "Combined" : `${value} only`}</button>)}</div><label className="search-control"><Search size={17} /><span className="sr-only">Search periods</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search periods" /></label></div>
    <div className="table-frame"><table className="data-table period-table"><thead><tr><th aria-label="Expand" /><th>Status</th><th>Pay date</th><th>Earning period</th><th>Cash window</th><th>Net paycheck</th><th>Other inflow</th><th>Total inflow</th><th>Total outflow</th><th title="Outflow divided by inflow">Outflow %</th><th>Margin</th><th title="Margin divided by inflow">Margin %</th><th>Budget variance</th><th>Forecast variance</th></tr></thead><tbody>{periods.map((period) => <PeriodRows key={period.id} period={period} expanded={expanded === period.id} toggle={() => setExpanded((current) => current === period.id ? undefined : period.id)} />)}</tbody></table>{!periods.length && <div className="empty-state">No periods match this filter.</div>}</div>
  </div>;
}

function PeriodRows({ period, expanded, toggle }: { period: import("../types").Period; expanded: boolean; toggle: () => void }) {
  const categories = Object.entries(period.categories).filter(([category, amount]) => category !== "Savings" && amount !== 0).sort((a, b) => b[1] - a[1]);
  return <>
    <tr className={expanded ? "expanded-row" : ""}><td><button className="disclosure" aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${shortDate(period.payDate)}`} onClick={toggle}>{expanded ? <ChevronDown /> : <ChevronRight />}</button></td><td><StatusMark status={period.status} /></td><td>{shortDate(period.payDate)}</td><td>{shortDate(period.periodStart)} – {shortDate(period.periodEnd)}</td><td>{shortDate(period.windowStart)} – {shortDate(period.windowEnd)}</td><td><Money cents={period.netPayCents} /></td><td><Money cents={period.otherInflowCents} /></td><td className="positive"><Money cents={period.totalInflowCents} /></td><td className="negative"><Money cents={period.totalOutflowCents} /></td><td><Ratio value={period.outflowRatio} /></td><td className={period.marginCents >= 0 ? "positive" : "negative"}><Money cents={period.marginCents} /></td><td><Ratio value={period.marginRatio} /></td><td><Money cents={period.budgetVarianceCents} /></td><td>{period.forecastVarianceCents === null ? "—" : <Money cents={period.forecastVarianceCents} />}</td></tr>
    {expanded && <tr className="detail-row"><td colSpan={14}><div className="period-detail"><section><h2>Category breakdown</h2><table className="compact-table"><thead><tr><th>Category</th><th>Amount</th><th>% of outflow</th></tr></thead><tbody>{categories.map(([category, amount]) => <tr key={category}><td>{category}</td><td><Money cents={amount} /></td><td>{period.totalOutflowCents ? ((amount / period.totalOutflowCents) * 100).toFixed(1) : "N/A"}%</td></tr>)}</tbody><tfoot><tr><th>Total</th><th><Money cents={period.totalOutflowCents} /></th><th>100%</th></tr></tfoot></table><div className="reconciliation-line"><StatusMark status="PASS" />Categories equal total outflow</div></section><section><h2>Transactions</h2>{period.transactions.length ? <div className="transaction-list">{period.transactions.map((transaction) => <div key={transaction.fingerprint}><span><strong>{transaction.description}</strong><small>{shortDate(transaction.transaction_at)} · {transaction.source_type}</small></span><span>{transaction.chosen_category}</span><Money cents={transaction.signed_amount_cents} className={transaction.signed_amount_cents < 0 ? "negative" : "positive"} /></div>)}</div> : <div className="empty-state compact">Forecast periods have no source transactions.</div>}</section></div></td></tr>}
  </>;
}
