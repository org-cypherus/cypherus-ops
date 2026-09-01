const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OWNER_HEADERS = new Set([
  "owner_user_id",
  "owneruserid",
  "owner_id",
  "ownerid",
  "owner",
  "responsavel",
  "responsible",
]);

export type ParsedImportLead = {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  origin?: string;
  ownerRef?: string;
  process: { totalValue: number };
};

export type ImportDirectoryUser = {
  id: string;
  name: string;
  email?: string;
};

export function parseLeadsCsv(text: string): ParsedImportLead[] {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const cols = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cols[i]?.trim() ?? "";
    });
    const ownerHeader = headers.find((header) => OWNER_HEADERS.has(header));
    return {
      name: row.nome || row.name || "Lead importado",
      email: row.email || `import-${Date.now()}-${index}@import.local`,
      phone: row.telefone || row.phone || "",
      cpf: row.cpf || "",
      origin: row.origem || row.origin || row.source || "Importação",
      ownerRef: (ownerHeader ? row[ownerHeader] : "") || undefined,
      process: { totalValue: totalValueFromRow(row) },
    };
  });
}

export function resolveImportOwnerId(
  ownerRef: string | undefined,
  users: ImportDirectoryUser[],
  fallbackId?: string,
): string {
  const raw = ownerRef?.trim() ?? "";
  if (raw) {
    if (UUID_RE.test(raw) || users.some((user) => user.id === raw)) return raw;
    const lower = raw.toLowerCase();
    const byId = users.find((user) => user.id.toLowerCase() === lower);
    if (byId) return byId.id;
    const byEmail = users.filter((user) => user.email?.toLowerCase() === lower);
    if (byEmail.length === 1) return byEmail[0].id;
    const byName = users.filter((user) => user.name.toLowerCase() === lower);
    if (byName.length === 1) return byName[0].id;
  }
  return fallbackId?.trim() ?? "";
}

export function applyImportOwners(
  rows: ParsedImportLead[],
  users: ImportDirectoryUser[],
  fallbackId?: string,
): Array<ParsedImportLead & { ownerId: string }> {
  return rows.map((row) => ({
    ...row,
    ownerId: resolveImportOwnerId(row.ownerRef, users, fallbackId),
  }));
}

export function buildImportCsv(
  rows: Array<{
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
    origin?: string;
    ownerId?: string;
    process?: { totalValue?: number };
  }>,
): string {
  const lines = ["name,cpf,owner_user_id,email,phone,source,process"];
  rows.forEach((row, index) => {
    const owner = row.ownerId?.trim() ?? "";
    if (!owner) {
      throw new Error(`Linha ${index + 2}: informe um responsável válido.`);
    }
    const process = JSON.stringify({
      potential_value: row.process?.totalValue ?? 0,
      value: row.process?.totalValue ?? 0,
    });
    const fields = [
      row.name,
      row.cpf || "",
      owner,
      row.email,
      row.phone || "",
      row.origin || "",
      process,
    ];
    lines.push(fields.map(csvCell).join(","));
  });
  return lines.join("\n");
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function totalValueFromRow(row: Record<string, string>): number {
  const fromValor = Number(row.valor || row.value || "");
  if (Number.isFinite(fromValor) && fromValor !== 0) return fromValor;
  const processRaw = row.process;
  if (processRaw) {
    try {
      const parsed = JSON.parse(processRaw) as {
        potential_value?: unknown;
        value?: unknown;
        totalValue?: unknown;
      };
      const nested = Number(parsed.potential_value ?? parsed.value ?? parsed.totalValue ?? 0);
      if (Number.isFinite(nested)) return nested;
    } catch {
      return 0;
    }
  }
  return Number.isFinite(fromValor) ? fromValor : 0;
}

function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = countUnquoted(headerLine, ",");
  const semicolons = countUnquoted(headerLine, ";");
  return semicolons > commas ? ";" : ",";
}

function countUnquoted(line: string, sep: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === sep) {
      count += 1;
    }
  }
  return count;
}

function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}
