import { getServerClient } from "@/src/lib/supabase/server";
import { embedQuery } from "@/src/lib/ai/embeddings";
import type { RetrievedChunk } from "@/src/lib/ai/system-prompt";

/**
 * Recupera los fragmentos más relevantes de los documentos del usuario.
 * Usa la RPC endurecida match_source_chunks, que filtra por auth.uid()
 * dentro del SQL (el usuario va en la sesión, no como parámetro).
 */
export async function retrieveContext(
  query: string,
  matchCount = 6,
): Promise<RetrievedChunk[]> {
  const supabase = await getServerClient();
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_source_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    min_similarity: 0.0,
  });

  if (error) {
    console.error("match_source_chunks error:", error.message);
    return [];
  }

  return (data ?? []) as RetrievedChunk[];
}
