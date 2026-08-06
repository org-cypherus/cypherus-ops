/** Gera senha padrão: último sobrenome (sem acento) + ano atual. Ex: Souza2026 */
export function defaultPasswordFromName(fullName: string, year = new Date().getFullYear()) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "User";
  const normalized = last
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "");
  return `${normalized}${year}`;
}
