// Extracción de texto plano de documentos. Formatos MVP: PDF, DOCX, TXT, MD.
// El .doc clásico NO está soportado (requiere conversión previa).

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;

export function extensionOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function isSupported(fileName: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(
    extensionOf(fileName),
  );
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str?: string }).str ?? "" : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) parts.push(`[página ${p}]\n${text}`);
  }
  await loadingTask.destroy();
  return parts.join("\n\n").trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

/** Extrae texto plano según la extensión del fichero. */
export async function extractText(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const ext = extensionOf(fileName);
  switch (ext) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "txt":
    case "md":
      return buffer.toString("utf8").trim();
    default:
      throw new Error(
        `Formato no soportado: .${ext}. Usa PDF, DOCX, TXT o MD.`,
      );
  }
}
