// Descarga e indexación de URLs de referencia. Se tratan como CONTENIDO NO
// CONFIABLE: solo dominios de la allowlist, HTML limpiado a texto, sin ejecutar
// instrucciones inyectadas (el texto va como dato citable, no como prompt).

// Dominios base permitidos (oficiales). Configurable por env (coma-separado).
const DEFAULT_ALLOWLIST = [
  "boe.es",
  "agenciatributaria.es",
  "agenciatributaria.gob.es",
  "sede.agenciatributaria.gob.es",
  "seg-social.es",
  "seg-social.gob.es",
  "sepe.es",
  "sepe.gob.es",
  "hacienda.gob.es",
  "mites.gob.es",
  "administracion.gob.es",
];

function allowlist(): string[] {
  const env = process.env.REFERENCE_URL_ALLOWLIST;
  if (env && env.trim()) {
    return env
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWLIST;
}

export function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return allowlist().some(
    (base) => host === base || host.endsWith(`.${base}`),
  );
}

export function allowedDomainsLabel(): string {
  return allowlist().join(", ");
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&ntilde;": "ñ",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&Ntilde;": "Ñ",
};

/** Convierte HTML a texto plano de forma básica y segura. */
export function htmlToText(html: string): string {
  let text = html;
  // Elimina bloques no textuales por completo.
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  // Saltos de bloque para no pegar palabras.
  text = text.replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Quita el resto de etiquetas.
  text = text.replace(/<[^>]+>/g, " ");
  // Entidades.
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  for (const [ent, ch] of Object.entries(ENTITIES)) {
    text = text.split(ent).join(ch);
  }
  // Normaliza espacios y líneas.
  text = text
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
  return text;
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? htmlToText(m[1]).slice(0, 200) : null;
}

export type FetchedUrl = { text: string; title: string | null };

/** Descarga una URL permitida y devuelve su texto + título. */
export async function fetchUrlContent(raw: string): Promise<FetchedUrl> {
  if (!isAllowedUrl(raw)) {
    throw new Error("Dominio no permitido para URLs de referencia.");
  }
  const res = await fetch(raw, {
    headers: { "user-agent": "jul-IA/1.0 (+reference indexer)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Descarga fallida (HTTP ${res.status}).`);

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  if (contentType.includes("text/html")) {
    return { text: htmlToText(body), title: extractTitle(body) };
  }
  // text/plain, markdown, etc.
  return { text: body.trim(), title: null };
}
