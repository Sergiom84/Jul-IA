import { extractText } from "../documents/extract";
import { chunkText } from "../documents/chunk";
import { embedTexts } from "../ai/embeddings";

export type EmbeddedChunk = {
  index: number;
  content: string;
  tokenCount: number;
  embedding: number[];
};

/** Trocea texto ya extraído y genera embeddings. */
export async function buildEmbeddedChunksFromText(
  text: string,
  maxChunkChars = 4000,
): Promise<EmbeddedChunk[]> {
  const chunks = chunkText(text, maxChunkChars);
  if (chunks.length === 0) return [];
  const embeddings = await embedTexts(chunks.map((c) => c.content));
  return chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
}

/**
 * Extrae texto de un fichero, lo trocea y genera embeddings.
 * Parte pura compartida por el worker de ingesta.
 */
export async function buildEmbeddedChunks(
  fileName: string,
  buffer: Buffer,
  maxChunkChars = 4000,
): Promise<EmbeddedChunk[]> {
  const text = await extractText(fileName, buffer);
  if (!text) {
    throw new Error(
      "No se pudo extraer texto del documento (¿es un PDF escaneado sin OCR?).",
    );
  }
  return buildEmbeddedChunksFromText(text, maxChunkChars);
}
