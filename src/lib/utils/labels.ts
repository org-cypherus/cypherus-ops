/** Converte `SNAKE_CASE` / `SCREAMING` em rótulo legível (`FOO_BAR` → `Foo bar`). */
export function humanizeEnumLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (!/^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(trimmed)) return trimmed;
  return trimmed
    .toLowerCase()
    .split("_")
    .map((word, index) => (index === 0 ? capitalizeWord(word) : word))
    .join(" ");
}

function capitalizeWord(word: string) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
