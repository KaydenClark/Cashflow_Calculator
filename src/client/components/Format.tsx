export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{usd.format(cents / 100)}</span>;
}

export function Ratio({ value }: { value: number | null }) {
  return <span>{value === null ? "N/A" : percent.format(value)}</span>;
}

export function shortDate(iso: string) {
  if (!iso) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}
