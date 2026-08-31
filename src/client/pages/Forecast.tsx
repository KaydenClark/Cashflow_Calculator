import { RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { useData } from "../DataContext";
import { CumulativeChart, ForecastChart } from "../components/Charts";
import { StatusMark } from "../components/StatusMark";
import type { Assumption, Scenario } from "../types";
import { PageState } from "./Overview";

export default function Forecast() {
  const { state, loading, error, scenario, setScenario, saveAssumption, refresh } = useData();
  if (loading && !state) return <PageState title="Calculating the forecast…" />;
  if (error || !state) return <PageState title={error || "Forecast is unavailable"} error />;
  const editableKeys = new Set(["regular_wage", "regular_hours", "overtime_hours", "overtime_multiplier", "tax_rate", "payroll_deductions", "rent", "insurance", "car_payment", "affirm_payment"]);
  return <div className="page forecast-page">
    <header className="page-header"><div><h1>Forecast & Scenarios</h1><p>Explainable category-level cash planning through December 31, 2028.</p></div><button className="button secondary" onClick={() => void refresh()}><RefreshCw size={17} />Recalculate</button></header>
    <div className="toolbar"><div className="segmented" aria-label="Forecast scenario">{(["base", "lower", "higher"] as Scenario[]).map((value) => <button key={value} className={scenario === value ? "active" : ""} onClick={() => setScenario(value)}>{value === "base" ? "Base" : value === "lower" ? "Lower spend" : "Higher spend"}</button>)}</div><span className="date-range">Aug 2026 – Dec 2028</span></div>
    <div className="forecast-layout"><div><section className="panel"><div className="panel-heading"><div><h2>Projected inflow, outflow & margin</h2><p>Base values with historical residual range</p></div><StatusMark status="Forecast" /></div><ForecastChart periods={state.periods} /></section><section className="panel"><div className="panel-heading"><h2>Projected cumulative cash</h2><span>{scenario} scenario</span></div><CumulativeChart periods={state.periods} /></section><section className="panel"><div className="panel-heading"><h2>Category forecast methods</h2><span>Selected by lowest backtest error</span></div><table className="compact-table"><thead><tr><th>Category</th><th>Method</th><th>Typical error</th></tr></thead><tbody>{state.methods.map((method) => <tr key={method.category}><td>{method.category}</td><td>{method.method}</td><td>{(method.errorRatio * 100).toFixed(1)}%</td></tr>)}</tbody></table></section></div><aside className="panel assumption-editor"><div className="panel-heading"><div><h2>Assumption editor</h2><p>Changes are audited and recalculate the base.</p></div></div>{state.assumptions.filter((assumption) => editableKeys.has(assumption.assumption_key)).map((assumption) => <AssumptionControl key={assumption.assumption_key} assumption={assumption} save={saveAssumption} />)}</aside></div>
  </div>;
}

function AssumptionControl({ assumption, save }: { assumption: Assumption; save: (key: string, value: number, effectiveDate?: string | null, notes?: string) => Promise<void> }) {
  const [value, setValue] = useState(assumption.value_number);
  const [saving, setSaving] = useState(false);
  const changed = value !== assumption.value_number;
  return <div className="assumption-control"><div><strong>{assumption.label}</strong><small>{assumption.source} · {assumption.status}</small></div><div className="assumption-value"><input aria-label={`${assumption.label} value`} type="number" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} /><span>{assumption.unit}</span>{changed && <button className="icon-button" aria-label={`Save ${assumption.label}`} disabled={saving} onClick={async () => { setSaving(true); await save(assumption.assumption_key, value, assumption.effective_date, assumption.notes); setSaving(false); }}><Save size={16} /></button>}</div>{assumption.effective_date && <small>Effective {assumption.effective_date}</small>}</div>;
}
