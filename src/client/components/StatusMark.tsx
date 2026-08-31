import { AlertTriangle, CheckCircle2, Cloud, CircleDashed } from "lucide-react";

export function StatusMark({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const Icon = normalized === "actual" || normalized === "pass" || normalized === "active"
    ? CheckCircle2
    : normalized === "forecast"
      ? Cloud
      : normalized === "provisional"
        ? CircleDashed
        : AlertTriangle;
  const tone = normalized === "actual" || normalized === "pass" || normalized === "active"
    ? "positive"
    : normalized === "fail"
      ? "negative"
      : normalized === "forecast"
        ? "forecast"
        : "warning";
  return <span className={`status-mark ${tone}`}><Icon aria-hidden="true" size={16} /><span>{status}</span></span>;
}
