// Sanea un parámetro `next` (post-login) para evitar open redirects.
// Solo se aceptan rutas internas absolutas: un único "/" inicial, sin esquema,
// sin protocol-relative ("//"), sin backslash y sin ":" (bloquea javascript:, http:).

const FALLBACK = "/chat";

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return FALLBACK;

  let value = raw;
  // Decodifica para cazar trucos con %2F, %5C, etc.
  try {
    value = decodeURIComponent(raw);
  } catch {
    return FALLBACK;
  }

  if (!value.startsWith("/")) return FALLBACK; // debe ser ruta interna
  if (value.startsWith("//") || value.startsWith("/\\")) return FALLBACK; // protocol-relative
  if (value.includes("\\")) return FALLBACK; // backslashes
  if (value.includes(":")) return FALLBACK; // javascript:, http:, etc.
  // Rechaza caracteres de control (U+0000–U+001F).
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 0x20) return FALLBACK;
  }

  return value;
}
