import { describe, expect, it } from "vitest";
import { calculateCashMetrics, reconcileCategoryOutflow } from "../src/domain/finance.js";

describe("cash financial definitions", () => {
  it("computes margin and opposite ratios from cents", () => {
    expect(calculateCashMetrics(243_820, 158_642)).toEqual({
      inflowCents: 243_820,
      outflowCents: 158_642,
      marginCents: 85_178,
      outflowRatio: 158_642 / 243_820,
      marginRatio: 85_178 / 243_820,
    });
  });

  it("returns N/A ratios when inflow is zero", () => {
    expect(calculateCashMetrics(0, 12_500)).toMatchObject({
      marginCents: -12_500,
      outflowRatio: null,
      marginRatio: null,
    });
  });

  it("reconciles category cents exactly to total outflow", () => {
    expect(reconcileCategoryOutflow([35_000, 27_632, 21_768, 20_500, 19_800, 5_327, 28_615], 158_642)).toBe(true);
    expect(reconcileCategoryOutflow([35_000, 27_632], 158_642)).toBe(false);
  });
});
