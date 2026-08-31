import type { CashMetrics } from "./types.js";

export function calculateCashMetrics(_inflowCents: number, _outflowCents: number): CashMetrics {
  if (!Number.isInteger(_inflowCents) || !Number.isInteger(_outflowCents)) {
    throw new TypeError("Financial amounts must be stored as integer cents");
  }

  const marginCents = _inflowCents - _outflowCents;
  return {
    inflowCents: _inflowCents,
    outflowCents: _outflowCents,
    marginCents,
    outflowRatio: _inflowCents === 0 ? null : _outflowCents / _inflowCents,
    marginRatio: _inflowCents === 0 ? null : marginCents / _inflowCents,
  };
}

export function reconcileCategoryOutflow(_amounts: number[], _outflowCents: number): boolean {
  return _amounts.reduce((total, amount) => total + amount, 0) === _outflowCents;
}
