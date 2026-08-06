import { describe, expect, it } from "vitest";
import { calculateCommission } from "./commission";

describe("calculateCommission", () => {
  it("percentual_meta: soma de vendas bate a meta e % aplica no total", () => {
    // 3k + 2k + 6k = 11k ≥ 10k → 10% de 11k = 1100
    const total = 3000 + 2000 + 6000;
    expect(
      calculateCommission(total, { type: "percentual_meta", value: 10, threshold: 10000 }),
    ).toBe(1100);
  });

  it("percentual_meta: zera enquanto acumulado estiver abaixo da meta", () => {
    expect(
      calculateCommission(3000 + 2000, { type: "percentual_meta", value: 10, threshold: 10000 }),
    ).toBe(0);
    expect(
      calculateCommission(9999, { type: "percentual_meta", value: 10, threshold: 10000 }),
    ).toBe(0);
  });

  it("percentual_meta: na meta exata já libera % sobre o total", () => {
    expect(
      calculateCommission(10000, { type: "percentual_meta", value: 10, threshold: 10000 }),
    ).toBe(1000);
  });

  it("mantém percentual simples e taxa fixa", () => {
    expect(calculateCommission(10000, { type: "percentual", value: 15 })).toBe(1500);
    expect(calculateCommission(10000, { type: "taxa", value: 500 })).toBe(500);
  });
});
