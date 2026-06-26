import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Anthropic no ofrece embeddings: siempre OpenAI. 1536 dims (text-embedding-3-small).
export const EMBEDDING_DIMENSIONS = 1536;

function embeddingModel() {
  return openai.textEmbedding(
    process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  );
}

// OpenAI limita ~300k tokens por petición de embeddings. Batcheamos por debajo
// de ese límite (y por número de ítems) para documentos largos (leyes, BOE…).
const MAX_TOKENS_PER_BATCH = 250_000;
const MAX_ITEMS_PER_BATCH = 200;
const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/** Embebe muchos textos en lotes seguros bajo el límite de tokens de OpenAI. */
export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];

  const model = embeddingModel();
  const out: number[][] = [];
  let batch: string[] = [];
  let tokens = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const { embeddings } = await embedMany({ model, values: batch });
    out.push(...embeddings);
    batch = [];
    tokens = 0;
  };

  for (const value of values) {
    const tk = estimateTokens(value);
    if (
      batch.length > 0 &&
      (tokens + tk > MAX_TOKENS_PER_BATCH || batch.length >= MAX_ITEMS_PER_BATCH)
    ) {
      await flush();
    }
    batch.push(value);
    tokens += tk;
  }
  await flush();

  return out;
}

/** Embebe una única consulta. */
export async function embedQuery(value: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value });
  return embedding;
}
