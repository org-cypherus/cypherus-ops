import { describe, expect, it } from "vitest";
import {
  contractDataValue,
  dayKey,
  filterContracts,
  mapContract,
  toUiPlaceholders,
  type Contract,
  type CrmContract,
} from "./services";

const sample: CrmContract = {
  id: "c1",
  lead_id: "lead-1",
  template_id: "tpl-1",
  title: "Contrato PF",
  status: "GENERATED",
  data: { valor: "15300.50", nome: "Ana" },
  current_version: 2,
  signed_attachment_id: null,
  created_at: "2026-08-10T12:00:00.000Z",
  updated_at: "2026-08-11T12:00:00.000Z",
  signed_at: null,
  archived_at: null,
  versions: [
    { version: 1, attachment_id: "att-1", created_at: "2026-08-10T12:00:00.000Z" },
    { version: 2, attachment_id: "att-2", created_at: "2026-08-11T12:00:00.000Z" },
  ],
};

describe("contractDataValue", () => {
  it("prefers valor over value", () => {
    expect(contractDataValue({ valor: "10", value: "20" })).toBe(10);
    expect(contractDataValue({ value: "20.5" })).toBe(20.5);
    expect(contractDataValue({})).toBe(0);
  });
});

describe("mapContract", () => {
  it("maps ContractResponse fields and current version attachment", () => {
    const mapped = mapContract(sample, {
      leadName: "Ana",
      templateName: "Modelo PF",
    });
    expect(mapped).toMatchObject({
      id: "c1",
      leadId: "lead-1",
      leadName: "Ana",
      title: "Contrato PF",
      templateId: "tpl-1",
      templateName: "Modelo PF",
      status: "Enviado",
      value: 15300.5,
      currentVersion: 2,
      pdfId: "att-2",
    });
  });

  it("falls back to title when template name is missing", () => {
    expect(mapContract({ ...sample, template_id: null }).templateName).toBe("Contrato PF");
  });
});

describe("toUiPlaceholders", () => {
  it("wraps CRM bare keys", () => {
    expect(toUiPlaceholders(["nome", "{{cpf}}"])).toEqual(["{{nome}}", "{{cpf}}"]);
  });
});

describe("filterContracts", () => {
  const contracts: Contract[] = [
    {
      id: "1",
      leadId: "l1",
      leadName: "Ana",
      title: "Contrato A",
      templateId: "t1",
      templateName: "PF",
      status: "Rascunho",
      value: 10,
      createdAt: "2026-02-01T15:00:00.000Z",
      currentVersion: 0,
    },
    {
      id: "2",
      leadId: "l2",
      leadName: "Bruno",
      title: "Contrato B",
      templateId: "t2",
      templateName: "PJ",
      status: "Assinado",
      value: 20,
      createdAt: "2026-03-01T15:00:00.000Z",
      currentVersion: 1,
    },
  ];

  it("filters by calendar day of createdAt", () => {
    const filtered = filterContracts(contracts, {
      lead: "",
      status: "",
      template: "",
      from: "2026-03-01",
      to: "2026-03-01",
    });
    expect(filtered.map((item) => item.id)).toEqual(["2"]);
  });

  it("filters by lead and template text", () => {
    expect(
      filterContracts(contracts, {
        lead: "ana",
        status: "",
        template: "pf",
        from: "",
        to: "",
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });
});

describe("dayKey", () => {
  it("keeps YYYY-MM-DD prefix", () => {
    expect(dayKey("2026-08-21T23:59:59.000Z")).toBe("2026-08-21");
  });
});
