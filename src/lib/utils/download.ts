export function downloadDataUrl(fileName: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
