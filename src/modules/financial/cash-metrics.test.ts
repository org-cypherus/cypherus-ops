import { describe, expect, it } from "vitest";
import { buildCashPanelMetrics } from "./cash-metrics";
import type { Payment } from "./services";

function payment(partial: Partial<Payment> & Pick<Payment, "id" | "status" | "amount" | "dueDate">): Payment {
  return {
    contractId: "c1",
    leadName: "Lead",
    ...partial,
  };
}

describe("buildCashPanelMetrics", () => {
  const today = new Date("2026-08-21T12:00:00");

  it("splits amounts by status and computes collection rate", () => {
    const metrics = buildCashPanelMetrics(
      [
        payment({ id: "1", status: "Recebido", amount: 1000, dueDate: "2026-08-10" }),
        payment({ id: "2", status: "Pendente", amount: 400, dueDate: "2026-08-25" }),
        payment({ id: "3", status: "Atrasado", amount: 600, dueDate: "2026-08-01" }),
      ],
      today,
    );

    expect(metrics.received).toBe(1000);
    expect(metrics.pending).toBe(400);
    expect(metrics.overdue).toBe(600);
    expect(metrics.collectionRate).toBe(1000 / 1600);
  });

  it("buckets open receivables by aging", () => {
    const metrics = buildCashPanelMetrics(
      [
        payment({ id: "1", status: "Pendente", amount: 100, dueDate: "2026-08-25" }),
        payment({ id: "2", status: "Atrasado", amount: 200, dueDate: "2026-08-18" }),
        payment({ id: "3", status: "Atrasado", amount: 300, dueDate: "2026-08-05" }),
        payment({ id: "4", status: "Recebido", amount: 999, dueDate: "2026-07-01" }),
      ],
      today,
    );

    expect(metrics.aging.find((b) => b.key === "on_time")?.amount).toBe(100);
    expect(metrics.aging.find((b) => b.key === "1_7")?.amount).toBe(200);
    expect(metrics.aging.find((b) => b.key === "16_30")?.amount).toBe(300);
    expect(metrics.next7Days).toBe(100);
  });
});
