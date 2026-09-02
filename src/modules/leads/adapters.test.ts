import { describe, expect, it } from "vitest";
import {
  daysSince,
  nextLeadCursor,
  processPotentialValue,
  toUiLead,
  unwrapLeadList,
  type CrmLead,
} from "./adapters";

const baseLead: CrmLead = {
  id: "lead-1",
  company_id: "c1",
  owner_user_id: "u1",
  name: "Ana",
  cpf: "000",
  status: "NEW",
  priority: "HIGH",
  tags: [],
  process: { potential_value: "15000.50", bank: "XP" },
  created_at: "2026-08-01T12:00:00.000Z",
  updated_at: "2026-08-18T12:00:00.000Z",
};

describe("unwrapLeadList", () => {
  it("reads LeadListResponse items", () => {
    expect(unwrapLeadList({ items: [baseLead], next_cursor: "x" })).toEqual([baseLead]);
  });

  it("accepts a raw array for backward compatibility", () => {
    expect(unwrapLeadList([baseLead])).toEqual([baseLead]);
  });

  it("returns empty for unexpected shapes", () => {
    expect(unwrapLeadList(null)).toEqual([]);
    expect(unwrapLeadList({})).toEqual([]);
  });
});

describe("nextLeadCursor", () => {
  it("reads next_cursor", () => {
    expect(nextLeadCursor({ items: [], next_cursor: "abc" })).toBe("abc");
    expect(nextLeadCursor({ items: [], next_cursor: null })).toBeNull();
  });
});

describe("processPotentialValue", () => {
  it("prefers potential_value then value over totalValue", () => {
    expect(processPotentialValue({ potential_value: 10, value: 20, totalValue: 30 })).toBe(10);
    expect(processPotentialValue({ value: "20.5", totalValue: 30 })).toBe(20.5);
    expect(processPotentialValue({ totalValue: 30 })).toBe(30);
  });
});

describe("daysSince / toUiLead", () => {
  it("maps days in stage from updated_at and potential_value", () => {
    const today = new Date("2026-08-20T15:00:00.000Z");
    expect(daysSince("2026-08-18T12:00:00.000Z", today)).toBe(2);
    const ui = toUiLead({
      ...baseLead,
      updated_at: "2026-08-18T12:00:00.000Z",
    }, "João");
    expect(ui.process.totalValue).toBe(15000.5);
    expect(ui.updatedAt).toBe("2026-08-18T12:00:00.000Z");
    expect(ui.daysInStage).toBe(daysSince(ui.updatedAt, new Date()));
  });
});

describe("timeline events", () => {
  it("orders events from newest to oldest", () => {
    const ui = toUiLead(baseLead, "João", {
      events: [
        {
          type: "LEAD_CREATED",
          payload: { actor_name: "Sistema" },
          created_at: "2026-08-01T12:00:00.000Z",
        },
        {
          type: "CONTRACT_CREATED",
          payload: { actor_name: "Sistema" },
          created_at: "2026-08-20T12:00:00.000Z",
        },
      ],
    });
    expect(ui.timeline.map((item) => item.type)).toEqual(["CONTRACT_CREATED", "LEAD_CREATED"]);
  });

  it("maps timeline event labels in the description fallback", () => {
    const ui = toUiLead(baseLead, "João", {
      events: [
        {
          type: "CONTRACT_CREATED",
          payload: { actor_name: "Sistema" },
          created_at: "2026-08-20T12:00:00.000Z",
        },
      ],
    });
    expect(ui.timeline[0].type).toBe("CONTRACT_CREATED");
    expect(ui.timeline[0].description).toBe("Contrato criado");
    expect(ui.timeline[0].userName).toBe("Sistema");
  });

  it("includes destination stage on STAGE_CHANGED", () => {
    const ui = toUiLead(baseLead, "João", {
      events: [
        {
          type: "STAGE_CHANGED",
          payload: { from_status: "NEW", to_status: "CONTACTED", actor_name: "Bruno" },
          created_at: "2026-08-20T12:00:00.000Z",
        },
      ],
    });
    expect(ui.timeline[0].description).toBe("Status alterado: Novo Lead → Contato realizado");
  });
});

