import { describe, expect, it } from "vitest";
import { filenameFromDisposition } from "./download";

describe("filenameFromDisposition", () => {
  it("reads a quoted filename", () => {
    expect(filenameFromDisposition('attachment; filename="contrato-v1.pdf"', "fallback.pdf")).toBe(
      "contrato-v1.pdf",
    );
  });

  it("prefers RFC 5987 UTF-8 filename", () => {
    expect(
      filenameFromDisposition(
        "attachment; filename=\"plain.pdf\"; filename*=UTF-8''contrato%20assinado.pdf",
        "fallback.pdf",
      ),
    ).toBe("contrato assinado.pdf");
  });

  it("falls back when the header is missing", () => {
    expect(filenameFromDisposition(undefined, "anexo.pdf")).toBe("anexo.pdf");
  });
});
