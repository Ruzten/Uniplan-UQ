export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Clave tolerante para comparar nombres de materias entre fuentes: además de normalizar,
// quita la puntuación y la "s" final de cada palabra larga, así "SISTEMA DE INFORMACIÓN"
// y "Sistemas de Información" coinciden.
export function looseName(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word !== "")
    .map((word) =>
      word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word,
    )
    .join(" ");
}

// Devuelve el único elemento cuyo nombre coincide con clave tolerante; si ninguno o más de
// uno coincide, devuelve null para no asociar a ciegas.
export function findByLooseName<T extends { name: string }>(
  name: string,
  items: Iterable<T>,
): T | null {
  const key = looseName(name);
  if (key === "") {
    return null;
  }
  let found: T | null = null;
  for (const item of items) {
    if (looseName(item.name) === key) {
      if (found !== null) {
        return null;
      }
      found = item;
    }
  }
  return found;
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
