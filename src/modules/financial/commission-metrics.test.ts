import { describe, expect, it } from "vitest";
import { buildCommissionPanelMetrics, filterCommissions } from "./commission-metrics";
import type { Commission } from "./services";

function commission(partial: Partial<Commission> & Pick<Commission, "id" | "userName" | "amount">): Commission {
  return {
    status: "Percentual",
    kind: "PERCENT",
    baseAmount: partial.amount,
    ...partial,
  };
}

describe("commission metrics", () => {
  it("aggregates by beneficiary and ranks top users", () => {
    const metrics = buildCommissionPanelMetrics(
      [
        commission({ id: "1", userName: "Ana", amount: 1000 }),
        commission({ id: "2", userName: "Bruno", amount: 500 }),
        commission({ id: "3", userName: "Ana", amount: 200 }),
      ],
      2,
    );

    expect(metrics.total).toBe(1700);
    expect(metrics.count).toBe(3);
    expect(metrics.beneficiaries).toBe(2);
    expect(metrics.byUser[0]).toMatchObject({ userName: "Ana", amount: 1200, count: 2 });
    expect(metrics.topUsers.map((u) => u.userName)).toEqual(["Ana", "Bruno"]);
    expect(metrics.topShare).toBe(1);
  });

  it("filters by beneficiary and status", () => {
    const list = [
      commission({ id: "1", userName: "Ana Costa", amount: 10, status: "Percentual" }),
      commission({ id: "2", userName: "Bruno", amount: 20, status: "Fixa", kind: "FIXED" }),
    ];
    expect(filterCommissions(list, { beneficiary: "ana", status: "" })).toHaveLength(1);
    expect(filterCommissions(list, { beneficiary: "", status: "Fixa" })).toHaveLength(1);
  });
});
