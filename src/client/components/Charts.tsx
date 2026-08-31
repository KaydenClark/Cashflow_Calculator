import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthToDate, Period } from "../types";
import { usd, usdCompact } from "./Format";

const axis = { fill: "#607078", fontSize: 11 };

const FLOW = {
  actual: { inflow: "#9dc4a5", outflow: "#eaa79c" },
  forecast: { inflow: "#8fb4c9", outflow: "#e3c48f" },
};

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number | null; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item) => item.value !== null && item.value !== undefined).filter((item, index, all) => all.findIndex((other) => other.name === item.name) === index);
  if (!rows.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{rows.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {usd.format((item.value ?? 0) / 100)}</span>)}</div>;
}

export function CashFlowChart({ periods, selectedId, compact = false }: { periods: Period[]; selectedId?: string; compact?: boolean }) {
  const size = compact ? 16 : 26;
  const lead = compact ? 8 : 12;
  const firstForecast = periods.findIndex((period) => period.status === "Forecast");
  const anchor = firstForecast < 0 ? periods.length : firstForecast;
  let start = Math.max(0, anchor - lead);
  let end = Math.min(periods.length, start + size);
  const selectedIndex = periods.findIndex((period) => period.id === selectedId);
  if (selectedIndex >= 0 && (selectedIndex < start || selectedIndex >= end)) start = Math.max(0, Math.min(selectedIndex - Math.floor(size / 2), periods.length - size));
  end = Math.min(periods.length, start + size);
  const visible = periods.slice(start, end);
  const rows = visible.map((period, index) => {
    const isForecast = period.status === "Forecast";
    const bridges = !isForecast && visible[index + 1]?.status === "Forecast";
    return {
      id: period.id,
      label: period.payDate.slice(5),
      inflow: period.totalInflowCents,
      outflow: -period.totalOutflowCents,
      marginActual: isForecast ? null : period.marginCents,
      marginForecast: isForecast || bridges ? period.marginCents : null,
      forecast: isForecast,
      selected: period.id === selectedId,
    };
  });
  const selectedLabel = rows.find((row) => row.selected)?.label;
  return <ResponsiveContainer width="100%" height={compact ? 208 : 300}>
    <ComposedChart data={rows} margin={{ top: 8, right: 12, left: compact ? -18 : 0, bottom: 0 }} barCategoryGap="22%" stackOffset="sign">
      <CartesianGrid stroke="#eef2f4" vertical={false} />
      {selectedLabel ? <ReferenceLine x={selectedLabel} stroke="#7d97a5" strokeOpacity={0.16} strokeWidth={38} /> : null}
      <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "#cfd8dc" }} minTickGap={18} />
      <YAxis tick={axis} tickFormatter={(value) => usdCompact.format(value / 100)} tickLine={false} axisLine={false} />
      <Tooltip content={<TooltipContent />} />
      <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
      <ReferenceLine y={0} stroke="#b6c2c8" />
      <Bar dataKey="inflow" name="Inflow" stackId="flow" fill={FLOW.actual.inflow} maxBarSize={26} radius={[2, 2, 0, 0]}>
        {rows.map((row) => <Cell key={row.id} fill={row.forecast ? FLOW.forecast.inflow : FLOW.actual.inflow} />)}
      </Bar>
      <Bar dataKey="outflow" name="Outflow" stackId="flow" fill={FLOW.actual.outflow} maxBarSize={26} radius={[0, 0, 2, 2]}>
        {rows.map((row) => <Cell key={row.id} fill={row.forecast ? FLOW.forecast.outflow : FLOW.actual.outflow} />)}
      </Bar>
      <Line dataKey="marginActual" name="Margin" stroke="#142129" strokeWidth={2.6} connectNulls={false} dot={{ r: 2.6, fill: "#142129", stroke: "#fff", strokeWidth: 1.4 }} activeDot={{ r: 4.5 }} />
      <Line dataKey="marginForecast" name="Margin" legendType="none" stroke="#142129" strokeWidth={2.6} strokeDasharray="1 5" strokeLinecap="round" connectNulls={false} dot={{ r: 2.6, fill: "#fff", stroke: "#142129", strokeWidth: 1.6 }} activeDot={{ r: 4.5 }} />
    </ComposedChart>
  </ResponsiveContainer>;
}

/**
 * The pay-period chart re-cut by calendar day: inflow above the axis, outflow
 * below, and the month's running margin as the line. Every elapsed day is
 * plotted even when nothing posted, so gaps read as quiet days rather than as
 * missing calendar spacing. Days are not split into actual and forecast because
 * the month-to-date series never runs past the as-of date.
 */
export function DailyFlowChart({ month, compact = false }: { month: MonthToDate; compact?: boolean }) {
  const rows = month.daily.map((row) => ({
    date: row.date,
    label: dayLabel.format(new Date(`${row.date}T12:00:00Z`)),
    inflow: row.inflowCents,
    outflow: -row.outflowCents,
    margin: row.cumulativeMarginCents,
  }));
  return <ResponsiveContainer width="100%" height={compact ? 208 : 300}>
    <ComposedChart data={rows} margin={{ top: 8, right: 12, left: compact ? -18 : 0, bottom: 0 }} barCategoryGap="22%" stackOffset="sign">
      <CartesianGrid stroke="#eef2f4" vertical={false} />
      <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "#cfd8dc" }} minTickGap={18} />
      <YAxis tick={axis} tickFormatter={(value) => usdCompact.format(value / 100)} tickLine={false} axisLine={false} />
      <Tooltip content={<TooltipContent />} />
      <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
      <ReferenceLine y={0} stroke="#b6c2c8" />
      <Bar dataKey="inflow" name="Inflow" stackId="flow" fill={FLOW.actual.inflow} maxBarSize={26} radius={[2, 2, 0, 0]} />
      <Bar dataKey="outflow" name="Outflow" stackId="flow" fill={FLOW.actual.outflow} maxBarSize={26} radius={[0, 0, 2, 2]} />
      <Line dataKey="margin" name="Running margin" stroke="#142129" strokeWidth={2.6} dot={false} activeDot={{ r: 4.5 }} />
    </ComposedChart>
  </ResponsiveContainer>;
}

export function ForecastChart({ periods }: { periods: Period[] }) {
  const rows = periods.filter((period) => period.status === "Forecast").map((period) => ({
    label: period.payDate.slice(0, 7),
    inflow: period.totalInflowCents,
    outflow: period.totalOutflowCents,
    margin: period.marginCents,
    low: period.lowOutflowCents ?? period.totalOutflowCents,
    high: period.highOutflowCents ?? period.totalOutflowCents,
  }));
  return <ResponsiveContainer width="100%" height={340}>
    <AreaChart data={rows} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="#e8edef" vertical={false} />
      <XAxis dataKey="label" tick={axis} minTickGap={34} tickLine={false} />
      <YAxis tick={axis} tickFormatter={(value) => usdCompact.format(value / 100)} tickLine={false} axisLine={false} />
      <Tooltip content={<TooltipContent />} />
      <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
      <Area dataKey="high" name="High range" stroke="none" fill="#e7ecef" fillOpacity={0.8} />
      <Area dataKey="low" name="Low range" stroke="none" fill="#fff" fillOpacity={1} />
      <Line dataKey="inflow" name="Inflow" stroke="#2f7541" strokeWidth={2} dot={false} />
      <Line dataKey="outflow" name="Outflow" stroke="#d94f3d" strokeWidth={2} dot={false} />
      <Line dataKey="margin" name="Margin" stroke="#55666d" strokeWidth={2} dot={false} strokeDasharray="4 4" />
    </AreaChart>
  </ResponsiveContainer>;
}

export function CumulativeChart({ periods }: { periods: Period[] }) {
  const rows = periods.filter((period) => period.status === "Forecast").map((period) => ({ label: period.payDate.slice(0, 7), cash: period.cumulativeMarginCents }));
  return <ResponsiveContainer width="100%" height={245}>
    <BarChart data={rows} margin={{ top: 10, right: 10, left: -2, bottom: 0 }}>
      <CartesianGrid stroke="#e8edef" vertical={false} />
      <XAxis dataKey="label" tick={axis} minTickGap={34} tickLine={false} />
      <YAxis tick={axis} tickFormatter={(value) => usdCompact.format(value / 100)} tickLine={false} axisLine={false} />
      <Tooltip content={<TooltipContent />} />
      <Bar dataKey="cash" name="Projected cumulative cash" fill="#2f7541" radius={[2, 2, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>;
}
