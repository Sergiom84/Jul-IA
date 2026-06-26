import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Anthropic no ofrece embeddings: siempre OpenAI. 1536 dims (text-embedding-3-small).
export const EMBEDDING_DIMENSIONS = 1536;

function embeddingModel() {
  return openai.textEmbedding(
    process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  );
}

/** Embebe muchos textos (auto-batch interno del SDK). */
export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel(),
    values,
  });
  return embeddings;
}

/** Embebe una única consulta. */
export async function embedQuery(value: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value });
  return embedding;
}
