import { describe, expect, it } from "vitest";
import { timelineEventDescription, timelineEventLabel } from "./timeline-labels";

describe("timelineEventLabel", () => {
  it("maps known CRM events to pt-BR", () => {
    expect(timelineEventLabel("CONTRACT_CREATED")).toBe("Contrato criado");
    expect(timelineEventLabel("LEAD_CREATED")).toBe("Criado");
    expect(timelineEventLabel("PAYMENT_CONFIRMED")).toBe("Pagamento confirmado");
  });

  it("falls back to a humanized label", () => {
    expect(timelineEventLabel("FOO_BAR")).toBe("Foo bar");
    expect(timelineEventLabel("WhatsApp")).toBe("WhatsApp");
  });
});

describe("timelineEventDescription", () => {
  it("uses CRM to_status / from_status on STAGE_CHANGED", () => {
    expect(
      timelineEventDescription("STAGE_CHANGED", {
        from_status: "NEW",
        to_status: "NEGOTIATING",
      }),
    ).toBe("Status alterado: Novo Lead → Em negociação");
    expect(timelineEventDescription("STAGE_CHANGED", { to_status: "CONTACTED" })).toBe(
      "Status alterado para Contato realizado",
    );
  });

  it("prefers explicit description over status codes", () => {
    expect(
      timelineEventDescription("STAGE_CHANGED", {
        description: "Moveu no kanban",
        to_status: "NEW",
      }),
    ).toBe("Moveu no kanban");
  });

  it("falls back to the type label when payload has no status", () => {
    expect(timelineEventDescription("STAGE_CHANGED", { actor_user_id: "u1" })).toBe(
      "Status alterado",
    );
    expect(timelineEventDescription("CONTRACT_CREATED")).toBe("Contrato criado");
  });
});
