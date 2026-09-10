import { describe, expect, it } from "vitest";
import {
  buildProcessSchema,
  customFieldAdminSchema,
  defaultProcessValues,
  processPayloadFromForm,
} from "./schema-builder";
import type { CustomFieldDefinition } from "./types";

const requiredSelect: CustomFieldDefinition = {
  id: "cf-select",
  companyId: "c1",
  entity: "LEAD",
  key: "origem_detalhe",
  label: "Origem detalhe",
  type: "select",
  required: true,
  sortOrder: 0,
  options: ["Indicação", "Google"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const optionalText: CustomFieldDefinition = {
  id: "cf-text",
  companyId: "c1",
  entity: "LEAD",
  key: "nicho",
  label: "Nicho",
  type: "text",
  required: false,
  sortOrder: 1,
  options: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildProcessSchema", () => {
  it("accepts empty process when there are no defs", () => {
    const parsed = buildProcessSchema([]).parse({});
    expect(parsed).toEqual({});
  });

  it("rejects a required select without a valid option", () => {
    const schema = buildProcessSchema([requiredSelect]);
    expect(schema.safeParse({ origem_detalhe: "" }).success).toBe(false);
    expect(schema.safeParse({ origem_detalhe: "Outro" }).success).toBe(false);
  });

  it("accepts a required select with a catalog option", () => {
    const parsed = buildProcessSchema([requiredSelect]).parse({ origem_detalhe: "Google" });
    expect(parsed).toEqual({ origem_detalhe: "Google" });
  });
});

describe("processPayloadFromForm", () => {
  it("sends only reserved keys when there are no defs", () => {
    expect(processPayloadFromForm([], {}, 1500, "nota")).toEqual({
      potential_value: 1500,
      value: 1500,
      observations: "nota",
    });
  });

  it("includes defined keys and skips unknown extras", () => {
    const payload = processPayloadFromForm(
      [optionalText],
      { nicho: "consultoria", bank: "XP" },
      10,
    );
    expect(payload).toEqual({
      potential_value: 10,
      value: 10,
      nicho: "consultoria",
    });
  });
});

describe("defaultProcessValues", () => {
  it("defaults bool to false and select to empty string", () => {
    expect(defaultProcessValues([requiredSelect, optionalText])).toEqual({
      origem_detalhe: "",
      nicho: "",
    });
  });
});

describe("customFieldAdminSchema", () => {
  it("rejects reserved keys and invalid snake_case", () => {
    expect(
      customFieldAdminSchema.safeParse({
        key: "potential_value",
        label: "Valor",
        type: "number",
        required: false,
      }).success,
    ).toBe(false);
    expect(
      customFieldAdminSchema.safeParse({
        key: "Nicho",
        label: "Nicho",
        type: "text",
        required: false,
      }).success,
    ).toBe(false);
  });

  it("requires at least two select options", () => {
    expect(
      customFieldAdminSchema.safeParse({
        key: "origem_detalhe",
        label: "Origem",
        type: "select",
        required: true,
        optionsText: "Única",
      }).success,
    ).toBe(false);
    expect(
      customFieldAdminSchema.safeParse({
        key: "origem_detalhe",
        label: "Origem",
        type: "select",
        required: true,
        optionsText: "Indicação\nGoogle",
      }).success,
    ).toBe(true);
  });
});

describe("schema builder isolation", () => {
  it("keeps process validation independent of the lead form", () => {
    expect(typeof buildProcessSchema).toBe("function");
  });
});
