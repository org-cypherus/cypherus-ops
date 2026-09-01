import { describe, expect, it } from "vitest";
import {
  calculateInstallmentReduction,
  clampReductionPercent,
} from "./installment-reduction";

describe("clampReductionPercent", () => {
  it("keeps values inside 0–100", () => {
    expect(clampReductionPercent(-10)).toBe(0);
    expect(clampReductionPercent(30)).toBe(30);
    expect(clampReductionPercent(140)).toBe(100);
  });
});

describe("calculateInstallmentReduction", () => {
  it("derives the new installment and payoff from the operator percent", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 1175,
        remainingInstallments: 36,
        reductionPercent: 30,
      }),
    ).toEqual({
      reductionPercent: 30,
      newInstallment: 822.5,
      monthlySavings: 352.5,
      totalSavings: 12690,
      originalRemaining: 42300,
      estimatedSettlement: 29610,
      estimatedRestitution: 0,
      hasSavings: true,
      status: "ok",
    });
  });

  it("treats 0% as no savings without negative numbers", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 900,
        remainingInstallments: 10,
        reductionPercent: 0,
      }),
    ).toMatchObject({
      newInstallment: 900,
      monthlySavings: 0,
      totalSavings: 0,
      originalRemaining: 9000,
      estimatedSettlement: 9000,
      hasSavings: false,
      status: "no_savings",
    });
  });

  it("stays incomplete until current installment and remaining are filled", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 0,
        remainingInstallments: 12,
        reductionPercent: 20,
      }).status,
    ).toBe("incomplete");

    expect(
      calculateInstallmentReduction({
        currentInstallment: 1000,
        remainingInstallments: 0,
        reductionPercent: 20,
      }).status,
    ).toBe("incomplete");
  });

  it("ignores fractional remaining installments", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 500,
        remainingInstallments: 6.9,
        reductionPercent: 20,
      }).totalSavings,
    ).toBe(600);
  });
});
