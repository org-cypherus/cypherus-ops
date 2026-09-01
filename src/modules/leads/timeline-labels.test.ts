import { describe, expect, it } from "vitest";
import { timelineEventLabel } from "./timeline-labels";

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
