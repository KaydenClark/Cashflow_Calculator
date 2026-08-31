import { ArrowDownRight, ArrowUpRight, CalendarDays, RefreshCw, ShieldAlert, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../DataContext";
import { CashFlowChart } from "../components/Charts";
import { Money, Ratio, shortDate } from "../components/Format";
import { StatusMark } from "../components/StatusMark";

export default function Overview() {
  const { state, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState<string>();
  const period = useMemo(() => state?.periods.find((row) => row.id === (selectedId ?? state.selectedPeriodId)) ?? state?.periods.at(-1), [state, selectedId]);
  if (loading && !state) return <PageState title="Loading your local cash flow…" />;
  if (error || !state || !period) return <PageState title={error || "No financial periods are available"} error />;
  const categoryRows = Object.entries(period.categories).filter(([name, amount]) => name !== "Savings" && amount !== 0).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categoryRows.map((row) => Math.abs(row[1])), 1);
  const previous = state.periods[state.periods.findIndex((row) => row.id === period.id) - 1];
  const movers = previous
    ? Array.from(new Set([...Object.keys(period.categories), ...Object.keys(previous.categories)]))
      .filter((name) => name !== "Savings")
      .map((category) => ({ category, deltaCents: (period.categories[category] ?? 0) - (previous.categories[category] ?? 0) }))
      .filter((row) => row.deltaCents !== 0)
      .sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents))
    : [];
  const topMover = movers[0];
  return <div className="page overview-page">
    <header className="page-header">
      <div><h1>Your cash, clearly mapped.</h1><p>Paycheck performance, category drivers, and forecast direction in one private view.</p></div>
      <div className="header-actions">
        <label className="select-control"><CalendarDays size={17} /><span className="sr-only">Selected pay period</span><select value={period.id} onChange={(event) => setSelectedId(event.target.value)}>{state.periods.map((row) => <option key={row.id} value={row.id}>{shortDate(row.windowStart)} – {shortDate(row.windowEnd)}</option>)}</select></label>
        <button className="button secondary" onClick={() => void refresh()}><RefreshCw size={17} />Refresh data</button>
      </div>
    </header>
    <section className="metric-rail" aria-label="Selected period metrics">
      <Metric label="Inflow" value={<Money cents={period.totalInflowCents} />} detail="Money available" tone="positive" icon={<ArrowDownRight />} />
      <Metric label="Outflow" value={<Money cents={period.totalOutflowCents} />} detail="Cash expenses" tone="negative" icon={<ArrowUpRight />} />
      <Metric label="Outflow %" value={<Ratio value={period.outflowRatio} />} detail="Of inflow" tone="negative" />
      <Metric label="Margin" value={<Money cents={period.marginCents} />} detail="Inflow less outflow" tone={period.marginCents >= 0 ? "positive" : "negative"} />
      <Metric label="Margin %" value={<Ratio value={period.marginRatio} />} detail="Retained share" tone={period.marginCents >= 0 ? "positive" : "negative"} />
      <Metric label="Retained cash" value={<Money cents={period.cumulativeMarginCents} />} detail="Cumulative margin" tone="positive" icon={<WalletCards />} />
    </section>
    <section className="panel chart-panel">
      <div className="panel-heading"><div><h2>Cash flow by pay period</h2><p><StatusMark status={period.status} /> Selected cash window</p></div><div className="status-legend"><span className="solid-line" />Actual <span className="dash-line" />Provisional <span className="dot-line" />Forecast</div></div>
      <CashFlowChart periods={state.periods} selectedId={period.id} compact />
    </section>
    <div className="overview-lower-grid">
      <section className="panel category-mix"><div className="panel-heading"><h2>Category mix</h2><span><Money cents={period.totalOutflowCents} /> total</span></div>{categoryRows.slice(0, 8).map(([category, amount]) => <div className="mix-row" key={category}><span>{category}</span><div className="mix-track"><i style={{ width: `${Math.abs(amount) / maxCategory * 100}%` }} /></div><Money cents={amount} /><small>{period.totalOutflowCents ? ((amount / period.totalOutflowCents) * 100).toFixed(1) : "N/A"}%</small></div>)}<Link to="/categories" className="text-link">View all categories →</Link></section>
      <section className="panel insight-panel"><div className="insight-icon"><ShieldAlert size={22} /></div><div><h2>What moved this period</h2><p>{categoryRows.slice(0, 2).map(([category]) => category).join(" and ") || "No reviewed spending"} {categoryRows.length > 1 ? "are" : "is"} the largest spending {categoryRows.length > 1 ? "drivers" : "driver"} in {shortDate(period.windowStart)} – {shortDate(period.windowEnd)}.{topMover && previous ? <> Against the prior window, {topMover.category} moved the most at {topMover.deltaCents > 0 ? "+" : "−"}<Money cents={Math.abs(topMover.deltaCents)} />.</> : null}{period.status === "Forecast" ? " Rent and auto insurance are held at their assumption values here, not added to historical baselines." : ""}</p><Link to="/forecast" className="text-link">See forecast details →</Link></div></section>
      <section className="panel freshness-panel"><div className="panel-heading"><h2>Data freshness & model health</h2><StatusMark status={state.meta.modelStatus} /></div><dl><div><dt>Bank transactions</dt><dd>{shortDate(state.meta.bankCutoff)}</dd></div><div><dt>Venmo</dt><dd>{shortDate(state.meta.venmoCutoff)}</dd></div><div><dt>Payroll</dt><dd>{shortDate(state.meta.payrollCutoff)}</dd></div><div><dt>Model version</dt><dd>{state.meta.modelVersion}</dd></div></dl><Link to="/data-health" className="text-link">Review data health →</Link></section>
    </div>
  </div>;
}

function Metric({ label, value, detail, tone, icon }: { label: string; value: React.ReactNode; detail: string; tone: string; icon?: React.ReactNode }) {
  return <article className={`metric ${tone}`}><div className="metric-label">{icon}<span>{label}</span></div><strong>{value}</strong><small>{detail}</small></article>;
}

export function PageState({ title, error = false }: { title: string; error?: boolean }) {
  return <div className={`page-state ${error ? "error" : ""}`}><span className="brand-mark"><WalletCards /></span><h1>{title}</h1><p>{error ? "Check that the local API is running, then refresh." : "Reading only the files stored on this device."}</p></div>;
}
