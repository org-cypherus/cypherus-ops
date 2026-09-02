import { describe, expect, it } from "vitest";
import { buildCashPanelMetrics, listUpcomingReceivables, upcomingReceivableDays } from "./cash-metrics";
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

describe("listUpcomingReceivables", () => {
  const today = new Date("2026-08-21T12:00:00");

  const rows = [
    payment({ id: "today", status: "Pendente", amount: 100, dueDate: "2026-08-21", leadName: "Ana", leadId: "l1" }),
    payment({ id: "sat", status: "Pendente", amount: 200, dueDate: "2026-08-22", leadName: "Bruno" }),
    payment({ id: "late", status: "Atrasado", amount: 300, dueDate: "2026-08-10", leadName: "Carla" }),
    payment({ id: "paid", status: "Recebido", amount: 400, dueDate: "2026-08-21", leadName: "Diego" }),
    payment({ id: "later", status: "Pendente", amount: 500, dueDate: "2026-09-01", leadName: "Elena" }),
  ];

  it("lists open payments due in the next 7 days", () => {
    const listed = listUpcomingReceivables(rows, today, "week");
    expect(listed.map((item) => item.id)).toEqual(["today", "sat"]);
  });

  it("filters by a single due date", () => {
    const listed = listUpcomingReceivables(rows, today, "2026-08-22");
    expect(listed.map((item) => item.id)).toEqual(["sat"]);
  });
});

describe("upcomingReceivableDays", () => {
  it("starts at today and covers seven days", () => {
    const days = upcomingReceivableDays(new Date("2026-08-21T12:00:00"));
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ key: "2026-08-21", weekday: "Hoje" });
    expect(days[6]?.key).toBe("2026-08-27");
  });
});
