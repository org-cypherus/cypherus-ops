import { describe, expect, it } from "vitest";
import { PIPELINE_STAGES } from "./types";

describe("pipeline stages", () => {
  it("contains the 7 MVP stages from the product spec", () => {
    expect(PIPELINE_STAGES).toEqual([
      "Novo Lead",
      "Contato realizado",
      "Em negociação",
      "Contrato enviado",
      "Contrato assinado",
      "Pagamento confirmado",
      "Concluído",
    ]);
  });
});
