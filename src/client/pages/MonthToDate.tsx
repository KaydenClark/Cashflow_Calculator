import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Flame, ShieldCheck } from "lucide-react";
import { useData } from "../DataContext";
import { DailyFlowChart } from "../components/Charts";
import { Money, Ratio, shortDate } from "../components/Format";
import { PageState } from "./Overview";

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

export default function MonthToDate() {
  const { state, loading, error } = useData();
  if (loading && !state) return <PageState title="Loading this month…" />;
  if (error || !state) return <PageState title={error || "Month-to-date data is unavailable"} error />;
  const month = state.monthToDate;
  if (!month) return <PageState title="No imported month is available yet" error />;

  const stale = month.coverage.filter((source) => !source.reachesAsOf);
  const maxCategory = Math.max(...month.categories.map((row) => Math.abs(row.amountCents)), 1);
  const priorAverage = month.pace.length
    ? Math.round(month.pace.reduce((sum, row) => sum + row.outflowToDayCents, 0) / month.pace.length)
    : null;

  return <div className="page month-page">
    <header className="page-header">
      <div>
        <h1>{monthLabel(month.month)} to date</h1>
        <p>{shortDate(month.monthStart)} through {shortDate(month.asOf)} · day {month.daysElapsed} of {month.daysInMonth} · calendar month, not a pay window.</p>
      </div>
    </header>

    {stale.length > 0 && <section className="coverage-banner" role="status">
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <strong>Incomplete month — {stale.map((source) => source.label).join(" and ")} not imported through {shortDate(month.asOf)}.</strong>
        <p>
          {stale.map((source) => `${source.label} stops at ${shortDate(source.cutoff)}, leaving ${source.missingDays} ${source.missingDays === 1 ? "day" : "days"} of this month unreported`).join("; ")}.
          Everything below counts only what the imported sources actually contain, so real spending is higher than these totals.
        </p>
      </div>
    </section>}

    <section className="metric-rail" aria-label="Month to date metrics">
      <Metric label="Outflow" value={<Money cents={month.outflowCents} />} detail="Reported spend" tone="negative" icon={<ArrowUpRight />} />
      <Metric label="Inflow" value={<Money cents={month.inflowCents} />} detail="Reported deposits" tone="positive" icon={<ArrowDownRight />} />
      <Metric label="Margin" value={<Money cents={month.marginCents} />} detail="Inflow less outflow" tone={month.marginCents >= 0 ? "positive" : "negative"} />
      <Metric label="Outflow %" value={<Ratio value={month.outflowRatio} />} detail="Of reported inflow" tone="negative" />
      <Metric label="Daily burn" value={<Money cents={month.dailyBurnCents} />} detail={`Across ${month.daysElapsed} days`} tone="negative" icon={<Flame />} />
      <Metric
        label="Projected month"
        value={month.projectedOutflowCents === null ? <span className="muted-value">Not estimated</span> : <Money cents={month.projectedOutflowCents} />}
        detail={month.projectedOutflowCents === null ? "Sources incomplete" : "Burn rate estimate"}
        tone="negative"
        icon={<CalendarClock />}
      />
    </section>

    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Cash flow by day</h2>
          <p>{shortDate(month.monthStart)} – {shortDate(month.asOf)} · {month.confidence === "complete" ? "every source imported through this date" : "counts only what the imported sources contain"}</p>
        </div>
        <span className={month.confidence === "complete" ? "positive" : "negative"}>Day {month.daysElapsed} of {month.daysInMonth}</span>
      </div>
      <DailyFlowChart month={month} compact />
    </section>

    <div className="month-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Where it went</h2><span><Money cents={month.outflowCents} /> reported</span></div>
        {month.categories.length === 0 && <p>No spending rows landed in this month yet.</p>}
        {month.categories.map((row) => <div className="mix-row" key={row.category}>
          <span title={row.category}>{row.category}</span>
          <div className="mix-track"><i style={{ width: `${Math.abs(row.amountCents) / maxCategory * 100}%` }} /></div>
          <Money cents={row.amountCents} />
          <small>{row.shareOfOutflow === null ? "N/A" : `${(row.shareOfOutflow * 100).toFixed(1)}%`}</small>
        </div>)}
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Source coverage</h2><span className={month.confidence === "complete" ? "positive" : "negative"}>{month.confidence === "complete" ? "Complete" : month.confidence === "partial" ? "Partial" : "No data"}</span></div>
        <table className="compact-table">
          <thead><tr><th>Source</th><th>Imported through</th><th>Rows</th><th>Missing days</th></tr></thead>
          <tbody>
            {month.coverage.map((source) => <tr key={source.sourceType}>
              <th scope="row">{source.label}</th>
              <td>{shortDate(source.cutoff)}</td>
              <td>{source.includedRowCount}</td>
              <td className={source.missingDays ? "negative" : "positive"}>{source.missingDays || "None"}</td>
            </tr>)}
            <tr>
              <th scope="row">Payroll</th>
              <td>{shortDate(month.payroll.cutoff)}</td>
              <td>{month.payroll.statements.length}</td>
              <td className={month.payroll.reachesMonthEnd ? "positive" : "negative"}>{month.payroll.reachesMonthEnd ? "None" : "Later pay dates missing"}</td>
            </tr>
          </tbody>
        </table>
        <p className="panel-note">
          {month.payroll.statements.length > 0
            ? <>Payroll records <Money cents={month.payroll.netPayCents} /> net paid this month ({month.payroll.statements.map((row) => shortDate(row.pay_date)).join(", ")}). Those deposits only reach the metrics above once the matching bank export is imported.</>
            : <>No payroll statement falls inside this month yet.</>}
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Pace vs prior months</h2><span>Same day of month</span></div>
        <table className="compact-table">
          <thead><tr><th>Month</th><th>By day {month.daysElapsed}</th><th>Full month</th></tr></thead>
          <tbody>
            <tr className="current-row"><th scope="row">{monthLabel(month.month)}</th><td><Money cents={month.outflowCents} /></td><td>{month.projectedOutflowCents === null ? "Not estimated" : <Money cents={month.projectedOutflowCents} />}</td></tr>
            {month.pace.map((row) => <tr key={row.month}>
              <th scope="row">{monthLabel(row.month)}</th>
              <td><Money cents={row.outflowToDayCents} /></td>
              <td><Money cents={row.fullMonthOutflowCents} /></td>
            </tr>)}
          </tbody>
        </table>
        <p className="panel-note">
          {month.paceDeltaCents === null
            ? <>Prior months are reference only. A pace comparison would mislead while {stale.length ? stale.map((source) => source.label).join(" and ") : "a source"} data is missing from this month, because the earlier months include every source.</>
            : <>Running <Money cents={Math.abs(month.paceDeltaCents)} /> {month.paceDeltaCents > 0 ? "above" : "below"} the <Money cents={priorAverage ?? 0} /> average for the same point in prior months.</>}
        </p>
      </section>
    </div>

    <section className="panel month-transactions">
      <div className="panel-heading"><div><h2>Every reported transaction this month</h2><p>{month.transactions.length} included rows, newest first.</p></div><span className="status-mark positive"><ShieldCheck size={15} /> Local only</span></div>
      <div className="table-frame">
        <table className="data-table month-table">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Source</th><th>Amount</th></tr></thead>
          <tbody>
            {month.transactions.map((row) => <tr key={row.fingerprint}>
              <td>{shortDate(row.transactionAt)}</td>
              <th scope="row">{row.description}</th>
              <td>{row.chosenCategory}</td>
              <td>{row.sourceType}</td>
              <td className={row.direction === "expense" ? "negative" : "positive"}><Money cents={row.signedAmountCents} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function Metric({ label, value, detail, tone, icon }: { label: string; value: React.ReactNode; detail: string; tone: string; icon?: React.ReactNode }) {
  return <article className={`metric ${tone}`}><div className="metric-label">{icon}<span>{label}</span></div><strong>{value}</strong><small>{detail}</small></article>;
}
