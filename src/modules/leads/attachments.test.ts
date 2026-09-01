import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  companyPath: (suffix: string) => `/v1/companies/co${suffix}`,
}));

import { mapLeadAttachment } from "./services";

describe("mapLeadAttachment", () => {
  it("uses mime_type from the CRM AttachmentResponse", () => {
    const mapped = mapLeadAttachment("lead-1", {
      id: "att-1",
      filename: "contrato.pdf",
      mime_type: "application/pdf",
      size_bytes: 2048,
      created_at: "2026-08-19T12:00:00.000Z",
    });
    expect(mapped.type).toBe("application/pdf");
    expect(mapped.name).toBe("contrato.pdf");
    expect(mapped.size).toBe(2048);
    expect(mapped.url).toBe("/v1/companies/co/leads/lead-1/attachments/att-1/content");
  });
});
