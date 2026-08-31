export interface EarningSlice {
  date: string;
  regularHours: number;
}

export function forecastRegularEarningsCents(
  _slices: EarningSlice[],
  _oldRateCents: number,
  _newRateCents: number,
  _effectiveDate: string,
): number {
  return Math.round(
    _slices.reduce(
      (total, slice) => total + slice.regularHours * (slice.date >= _effectiveDate ? _newRateCents : _oldRateCents),
      0,
    ),
  );
}

export function scheduleMonthlyOverride(
  _start: string,
  _horizon: string,
  _amountCents: number,
  _dayOfMonth: number,
): Array<{ date: string; amountCents: number }> {
  if (_amountCents < 0 || !Number.isInteger(_amountCents)) throw new TypeError("Override amount must be non-negative cents");
  if (_dayOfMonth < 1 || _dayOfMonth > 31) throw new RangeError("Day of month must be between 1 and 31");

  const start = new Date(`${_start}T12:00:00Z`);
  const horizon = new Date(`${_horizon}T12:00:00Z`);
  const results: Array<{ date: string; amountCents: number }> = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

  while (year < horizon.getUTCFullYear() || (year === horizon.getUTCFullYear() && month <= horizon.getUTCMonth())) {
    const lastDay = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
    const date = new Date(Date.UTC(year, month, Math.min(_dayOfMonth, lastDay), 12)).toISOString().slice(0, 10);
    if (date >= _start && date <= _horizon) results.push({ date, amountCents: _amountCents });
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return results;
}

export function removeFixedBaseline(
  _variableBaselineCents: Record<string, number>,
  _fixedCategories: string[],
): Record<string, number> {
  const fixed = new Set(_fixedCategories);
  return Object.fromEntries(Object.entries(_variableBaselineCents).filter(([category]) => !fixed.has(category)));
}
