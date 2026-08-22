import { describe, expect, it } from "vitest";
import {
  fillRevenueByMonth,
  formatMonthLabel,
  localDateKey,
  mapAdminDashboard,
  normalizePerformance,
  normalizeRevenueByMonth,
  periodRange,
  revenueByMonthFromPayments,
} from "./services";

describe("mapAdminDashboard", () => {
  it("maps CRM AdminDashboardResponse fields and conversion as 0–100", () => {
    const mapped = mapAdminDashboard({
      from: "2026-07-22",
      to: "2026-08-21",
      leads_received: 10,
      leads_by_origin: [
        { source: "google", lead_count: 7 },
        { source: null, lead_count: 3 },
      ],
      contracts_signed: 2,
      contracts_pending: 4,
      overdue_count: 1,
      overdue_amount: "500.50",
      revenue: "2000.00",
      revenue_by_month: [
        { month: "2026-07", amount: "500.00", count: 1 },
        { month: "2026-08-01T00:00:00Z", amount: 1500, count: 2 },
      ],
      ticket_average: "1000.00",
      active_users: 5,
    });

    expect(mapped).toEqual({
      from: "2026-07-22",
      to: "2026-08-21",
      leadsReceived: 10,
      conversion: 20,
      revenue: 2000,
      avgTicket: 1000,
      signedContracts: 2,
      pendingContracts: 4,
      overdueCount: 1,
      overdueAmount: 500.5,
      activeUsers: 5,
      leadsByOrigin: [
        { origin: "google", value: 7 },
        { origin: "Sem origem", value: 3 },
      ],
      revenueByMonth: [
        { month: "2026-07", amount: 500, count: 1 },
        { month: "2026-08", amount: 1500, count: 2 },
      ],
      performance: [],
    });
  });

  it("returns zero conversion when there are no leads", () => {
    expect(
      mapAdminDashboard({
        leads_received: 0,
        contracts_signed: 0,
        contracts_pending: 0,
        revenue: 0,
        ticket_average: 0,
      }).conversion,
    ).toBe(0);
  });

  it("tolerates AdminDashboard without revenue_by_month (HML/develop)", () => {
    expect(
      mapAdminDashboard({
        leads_received: 2,
        contracts_signed: 1,
        contracts_pending: 0,
        revenue: "1500.00",
        ticket_average: "1500.00",
      }).revenueByMonth,
    ).toEqual([]);
  });

  it("maps performance[] when present on admin response", () => {
    const mapped = mapAdminDashboard({
      leads_received: 5,
      contracts_signed: 1,
      contracts_pending: 0,
      revenue: 0,
      ticket_average: 0,
      performance: [
        {
          owner_user_id: "u-2",
          lead_count: 2,
          converted_count: 0,
          conversion_rate: 0,
          potential_value: "1000",
        },
        {
          owner_user_id: "u-1",
          lead_count: 5,
          converted_count: 2,
          conversion_rate: "40.00",
          potential_value: 10000,
        },
      ],
    });
    expect(mapped.performance).toEqual([
      {
        ownerUserId: "u-1",
        ownerName: "u-1",
        leadCount: 5,
        convertedCount: 2,
        conversionRate: 40,
        potentialValue: 10000,
      },
      {
        ownerUserId: "u-2",
        ownerName: "u-2",
        leadCount: 2,
        convertedCount: 0,
        conversionRate: 0,
        potentialValue: 1000,
      },
    ]);
  });
});

describe("normalizePerformance", () => {
  it("applies owner names and sorts by lead_count desc", () => {
    expect(
      normalizePerformance(
        [
          {
            owner_user_id: "b",
            lead_count: 1,
            converted_count: 0,
            conversion_rate: 0,
            potential_value: 10,
          },
          {
            owner_user_id: "a",
            lead_count: 3,
            converted_count: 1,
            conversion_rate: 33.33,
            potential_value: 99,
          },
        ],
        { a: "Ana", b: "Bruno" },
      ),
    ).toEqual([
      {
        ownerUserId: "a",
        ownerName: "Ana",
        leadCount: 3,
        convertedCount: 1,
        conversionRate: 33.33,
        potentialValue: 99,
      },
      {
        ownerUserId: "b",
        ownerName: "Bruno",
        leadCount: 1,
        convertedCount: 0,
        conversionRate: 0,
        potentialValue: 10,
      },
    ]);
  });
});
describe("normalizeRevenueByMonth", () => {
  it("accepts amount aliases and BR decimal strings", () => {
    expect(
      normalizeRevenueByMonth([{ month: "2026-08", value: "1.500,50", payment_count: 2 }]),
    ).toEqual([{ month: "2026-08", amount: 1500.5, count: 2 }]);
  });
});

describe("revenueByMonthFromPayments", () => {
  it("groups CONFIRMED payments by UTC month inside the period", () => {
    expect(
      revenueByMonthFromPayments(
        [
          {
            status: "CONFIRMED",
            amount: "500.00",
            paid_at: "2026-07-15T12:00:00Z",
          },
          {
            status: "CONFIRMED",
            amount: 1500,
            paid_at: null,
            created_at: "2026-08-02T01:00:00Z",
          },
          {
            status: "PENDING",
            amount: 999,
            paid_at: "2026-08-10T00:00:00Z",
          },
          {
            status: "CONFIRMED",
            amount: 100,
            paid_at: "2026-06-01T00:00:00Z",
          },
        ],
        "2026-07-01",
        "2026-08-31",
      ),
    ).toEqual([
      { month: "2026-07", amount: 500, count: 1 },
      { month: "2026-08", amount: 1500, count: 1 },
    ]);
  });
});

describe("fillRevenueByMonth", () => {
  it("fills sparse CRM months with zeros inside the period", () => {
    expect(
      fillRevenueByMonth(
        [{ month: "2026-08", amount: 100, count: 1 }],
        "2026-07-01",
        "2026-09-15",
      ),
    ).toEqual([
      { month: "2026-07", amount: 0, count: 0 },
      { month: "2026-08", amount: 100, count: 1 },
      { month: "2026-09", amount: 0, count: 0 },
    ]);
  });

  it("expands the window to keep months returned by the API", () => {
    expect(
      fillRevenueByMonth(
        [{ month: "2026-06", amount: 80, count: 1 }],
        "2026-07-01",
        "2026-08-01",
      ).find((item) => item.month === "2026-06"),
    ).toEqual({ month: "2026-06", amount: 80, count: 1 });
  });
});

describe("formatMonthLabel", () => {
  it("formats YYYY-MM in pt-BR", () => {
    expect(formatMonthLabel("2026-08").toLowerCase()).toContain("26");
  });
});

describe("periodRange", () => {
  it("uses local calendar dates", () => {
    const { from, to } = periodRange(0);
    expect(to).toBe(localDateKey());
    expect(from).toBe(localDateKey());
  });
});
