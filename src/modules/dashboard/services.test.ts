import { describe, expect, it } from "vitest";
import { localDateKey, mapAdminDashboard, periodRange } from "./services";

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
});

describe("periodRange", () => {
  it("uses local calendar dates", () => {
    const { from, to } = periodRange(0);
    expect(to).toBe(localDateKey());
    expect(from).toBe(localDateKey());
  });
});
