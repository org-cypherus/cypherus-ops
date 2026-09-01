import { api } from "@/lib/api/client";

export function downloadDataUrl(fileName: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(fileName, url);
  URL.revokeObjectURL(url);
}

export function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

function readAxiosHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const getter = headers as { get?: (key: string) => unknown };
  if (typeof getter.get === "function") {
    const value = getter.get(name);
    return typeof value === "string" ? value : undefined;
  }
  const rec = headers as Record<string, unknown>;
  const value = rec[name] ?? rec[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export async function downloadApiFile(path: string, fallbackName: string) {
  const response = await api.get<ArrayBuffer>(path, {
    responseType: "arraybuffer",
    headers: { Accept: "application/pdf,application/octet-stream,*/*" },
  });
  const mime = readAxiosHeader(response.headers, "content-type") || "application/pdf";
  const name = filenameFromDisposition(
    readAxiosHeader(response.headers, "content-disposition"),
    fallbackName,
  );
  downloadBlob(name, new Blob([response.data], { type: mime.split(";")[0] }));
  return name;
}

export async function fetchApiBlob(path: string) {
  const response = await api.get<ArrayBuffer>(path, {
    responseType: "arraybuffer",
    headers: { Accept: "application/pdf,image/*,text/plain,application/octet-stream,*/*" },
  });
  const mime = readAxiosHeader(response.headers, "content-type") || "application/octet-stream";
  return new Blob([response.data], { type: mime.split(";")[0] });
}

export function downloadText(fileName: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(fileName, url);
  URL.revokeObjectURL(url);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function parseLeadsCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    return {
      name: row.nome || row.name || "Lead importado",
      email: row.email || `${Date.now()}@import.local`,
      phone: row.telefone || row.phone || "",
      cpf: row.cpf || "",
      origin: row.origem || row.origin || "Importação",
      process: { totalValue: Number(row.valor || row.value || 0) },
    };
  });
}
