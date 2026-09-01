import { describe, expect, it } from "vitest";
import { calculateInstallmentReduction } from "./installment-reduction";

describe("calculateInstallmentReduction", () => {
  it("computes monthly, total and percent savings", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 1000,
        remainingInstallments: 12,
        newInstallment: 800,
      }),
    ).toEqual({
      monthlySavings: 200,
      totalSavings: 2400,
      reductionPercent: 20,
      hasSavings: true,
      status: "ok",
    });
  });

  it("does not return negative savings when the new installment is not lower", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 900,
        remainingInstallments: 10,
        newInstallment: 900,
      }),
    ).toEqual({
      monthlySavings: 0,
      totalSavings: 0,
      reductionPercent: 0,
      hasSavings: false,
      status: "no_savings",
    });

    expect(
      calculateInstallmentReduction({
        currentInstallment: 900,
        remainingInstallments: 10,
        newInstallment: 950,
      }).status,
    ).toBe("no_savings");
  });

  it("stays incomplete until current, remaining and new installment are filled", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 0,
        remainingInstallments: 12,
        newInstallment: 800,
      }).status,
    ).toBe("incomplete");

    expect(
      calculateInstallmentReduction({
        currentInstallment: 1000,
        remainingInstallments: 0,
        newInstallment: 800,
      }).status,
    ).toBe("incomplete");

    expect(
      calculateInstallmentReduction({
        currentInstallment: 1000,
        remainingInstallments: 12,
        newInstallment: 0,
      }).status,
    ).toBe("incomplete");
  });

  it("ignores fractional remaining installments", () => {
    expect(
      calculateInstallmentReduction({
        currentInstallment: 500,
        remainingInstallments: 6.9,
        newInstallment: 400,
      }).totalSavings,
    ).toBe(600);
  });
});
