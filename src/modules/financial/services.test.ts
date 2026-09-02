import { describe, expect, it } from "vitest";
import {
  dayKey,
  filterPayments,
  mapCommission,
  mapCommissionRule,
  mapPayment,
  periodFromIso,
  type CrmCommission,
  type CrmPayment,
  type CrmRule,
  type Payment,
} from "./services";

describe("mapPayment", () => {
  it("maps PaymentResponse including effective OVERDUE and commission_id", () => {
    const item: CrmPayment = {
      id: "p1",
      contract_id: "c1",
      lead_id: "lead-1",
      amount: "15300.50",
      due_date: "2026-08-01",
      status: "OVERDUE",
      paid_at: null,
      created_at: "2026-07-01T12:00:00.000Z",
      commission_id: "cm1",
    };
    expect(mapPayment(item, "Ana")).toEqual({
      id: "p1",
      contractId: "c1",
      leadId: "lead-1",
      leadName: "Ana",
      amount: 15300.5,
      dueDate: "2026-08-01",
      status: "Atrasado",
      paidAt: undefined,
      createdAt: "2026-07-01T12:00:00.000Z",
      commissionId: "cm1",
    });
  });
});

describe("mapCommission", () => {
  it("maps CommissionResponse fields without inventing CRM status", () => {
    const item: CrmCommission = {
      id: "cm1",
      payment_id: "p1",
      contract_id: "c1",
      beneficiary_user_id: "u1",
      kind: "PERCENT",
      base_amount: 1000,
      rate: "10",
      amount: "100.00",
      created_at: "2026-08-15T10:00:00.000Z",
    };
    expect(mapCommission(item, "Bruno")).toMatchObject({
      id: "cm1",
      userName: "Bruno",
      amount: 100,
      kind: "PERCENT",
      status: "Percentual",
      baseAmount: 1000,
      rate: 10,
      paymentId: "p1",
      contractId: "c1",
      period: "2026-08",
    });
  });
});

describe("mapCommissionRule", () => {
  it("maps PERCENT/FIXED only", () => {
    const percent: CrmRule = {
      id: "r1",
      name: "Padrão",
      kind: "PERCENT",
      rate: 12.5,
      amount: null,
      is_active: true,
    };
    const fixed: CrmRule = {
      id: "r2",
      name: "Fixo",
      kind: "FIXED",
      rate: null,
      amount: "500",
      is_active: false,
    };
    expect(mapCommissionRule(percent)).toEqual({
      id: "r1",
      plan: "Padrão",
      type: "percentual",
      value: 12.5,
      active: true,
    });
    expect(mapCommissionRule(fixed)).toEqual({
      id: "r2",
      plan: "Fixo",
      type: "taxa",
      value: 500,
      active: false,
    });
  });
});

describe("filterPayments", () => {
  const payments: Payment[] = [
    {
      id: "1",
      contractId: "c1",
      leadName: "Ana",
      amount: 10,
      dueDate: "2026-02-01",
      status: "Pendente",
    },
    {
      id: "2",
      contractId: "c2",
      leadName: "Bruno",
      amount: 20,
      dueDate: "2026-03-01T00:00:00.000Z",
      status: "Atrasado",
    },
  ];

  it("filters by due date calendar day", () => {
    expect(
      filterPayments(payments, {
        lead: "",
        status: "",
        from: "2026-03-01",
        to: "2026-03-01",
      }).map((item) => item.id),
    ).toEqual(["2"]);
  });
});

describe("dayKey / periodFromIso", () => {
  it("keeps local date prefixes", () => {
    expect(dayKey("2026-08-21T23:59:59.000Z")).toBe("2026-08-21");
    expect(periodFromIso("2026-08-21T23:59:59.000Z")).toBe("2026-08");
  });
});
