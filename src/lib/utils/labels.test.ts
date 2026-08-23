import { describe, expect, it } from "vitest";
import { humanizeEnumLabel } from "./labels";

describe("humanizeEnumLabel", () => {
  it("turns SNAKE_CASE into a readable label", () => {
    expect(humanizeEnumLabel("CONTRACT_CREATED")).toBe("Contract created");
    expect(humanizeEnumLabel("FOO_BAR")).toBe("Foo bar");
    expect(humanizeEnumLabel("NEW")).toBe("New");
  });

  it("leaves already-human labels untouched", () => {
    expect(humanizeEnumLabel("Google Ads")).toBe("Google Ads");
    expect(humanizeEnumLabel("Contrato criado")).toBe("Contrato criado");
    expect(humanizeEnumLabel("Recebido (3)")).toBe("Recebido (3)");
  });
});
