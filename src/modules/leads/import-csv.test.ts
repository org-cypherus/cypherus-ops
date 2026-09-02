import { describe, expect, it } from "vitest";
import {
  applyImportOwners,
  buildImportCsv,
  parseLeadsCsv,
  resolveImportOwnerId,
} from "./import-csv";

const users = [
  { id: "u1", name: "Ana Souza", email: "ana@cypherops.com" },
  { id: "u2", name: "Bruno Lima", email: "bruno@cypherops.com" },
];

describe("parseLeadsCsv", () => {
  it("parses portuguese headers", () => {
    const rows = parseLeadsCsv(
      ["nome,email,telefone,cpf,origem,valor", "Ana,ana@x.com,1199,111,Google Ads,15000"].join("\n"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Ana");
    expect(rows[0].process.totalValue).toBe(15000);
    expect(rows[0].ownerRef).toBeUndefined();
  });

  it("reads owner aliases and semicolon delimiter", () => {
    const rows = parseLeadsCsv(
      ["nome;cpf;responsável;email;valor", "Ana;52998224725;bruno@cypherops.com;ana@x.com;1200"].join(
        "\n",
      ),
    );
    expect(rows[0].ownerRef).toBe("bruno@cypherops.com");
    expect(rows[0].process.totalValue).toBe(1200);
    expect(rows[0].cpf).toBe("52998224725");
  });

  it("keeps owner_user_id from a CRM-style export", () => {
    const owner = "11111111-1111-4111-8111-111111111111";
    const rows = parseLeadsCsv(`name,cpf,owner_user_id\nAna,52998224725,${owner}\n`);
    expect(rows[0].ownerRef).toBe(owner);
  });
});

describe("resolveImportOwnerId", () => {
  it("matches email, name and UUID, then falls back", () => {
    expect(resolveImportOwnerId("bruno@cypherops.com", users)).toBe("u2");
    expect(resolveImportOwnerId("Ana Souza", users)).toBe("u1");
    expect(resolveImportOwnerId("u2", users, "u1")).toBe("u2");
    expect(resolveImportOwnerId("", users, "u1")).toBe("u1");
    expect(resolveImportOwnerId("desconhecido", users, "u1")).toBe("u1");
    expect(resolveImportOwnerId("11111111-1111-4111-8111-111111111111", users, "u1")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("applyImportOwners", () => {
  it("fills missing owners with the selected fallback", () => {
    const rows = parseLeadsCsv("nome,cpf,email\nAna,111,ana@x.com\n");
    const resolved = applyImportOwners(rows, users, "u1");
    expect(resolved[0].ownerId).toBe("u1");
  });
});

describe("buildImportCsv", () => {
  it("never sends an empty owner_user_id", () => {
    expect(() =>
      buildImportCsv([{ name: "Ana", email: "ana@x.com", cpf: "111" }]),
    ).toThrow(/responsável válido/);
  });

  it("quotes process JSON so commas stay in one cell", () => {
    const csv = buildImportCsv([
      {
        name: "Ana",
        email: "ana@x.com",
        cpf: "52998224725",
        ownerId: "u1",
        origin: "Google Ads",
        process: { totalValue: 15000 },
      },
    ]);
    expect(csv).toContain("owner_user_id");
    expect(csv).toContain('"u1"');
    const roundtrip = parseLeadsCsv(csv);
    expect(roundtrip[0].ownerRef).toBe("u1");
    expect(roundtrip[0].process.totalValue).toBe(15000);
  });
});
