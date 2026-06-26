// Procesado de una fuente (documento o URL): extrae → trocea → embeddings →
// escribe chunks y marca 'ready', todo en una transacción. Compartido por el
// procesado inline del web y por el worker.
import type { Sql } from "postgres";
import { STORAGE_BUCKET } from "../supabase/config";
import { buildEmbeddedChunks, buildEmbeddedChunksFromText } from "./pipeline";
import { fetchUrlContent } from "../documents/url";

export type IngestRow = {
  id: string;
  user_id: string;
  type: "document" | "url" | "official_site";
  title: string | null;
  file_name: string | null;
  storage_path: string | null;
  url: string | null;
};

type StorageApi = {
  from: (b: string) => {
    download: (p: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
  };
};

/**
 * Núcleo de ingesta. Lanza excepción si falla (el llamador decide cómo marcar
 * el error). En éxito deja la fuente en 'ready' con sus chunks.
 */
export async function runIngest(
  row: IngestRow,
  sql: Sql,
  storage: StorageApi,
  maxChunkChars: number,
): Promise<number> {
  let chunks;

  if (row.type === "document") {
    if (!row.storage_path) throw new Error("Sin storage_path");
    const { data, error } = await storage
      .from(STORAGE_BUCKET)
      .download(row.storage_path);
    if (error || !data) throw new Error(`Descarga fallida: ${error?.message}`);
    const buffer = Buffer.from(await data.arrayBuffer());
    chunks = await buildEmbeddedChunks(
      row.file_name ?? "documento",
      buffer,
      maxChunkChars,
    );
  } else {
    if (!row.url) throw new Error("Sin url");
    const { text, title } = await fetchUrlContent(row.url);
    if (!text) throw new Error("La URL no devolvió texto indexable.");
    chunks = await buildEmbeddedChunksFromText(text, maxChunkChars);
    if (!row.title && title) {
      await sql`update public.sources set title = ${title} where id = ${row.id}`;
    }
  }

  // Atómico: borra chunks previos, inserta los nuevos y marca ready.
  await sql.begin(async (tx) => {
    await tx`delete from public.source_chunks where source_id = ${row.id}`;
    for (const c of chunks) {
      const literal = `[${c.embedding.join(",")}]`;
      await tx`
        insert into public.source_chunks
          (source_id, user_id, chunk_index, content, token_count, embedding)
        values (${row.id}, ${row.user_id}, ${c.index}, ${c.content},
                ${c.tokenCount}, ${literal}::extensions.vector)`;
    }
    await tx`
      update public.sources
      set status = 'ready', chunk_count = ${chunks.length}, error = null, locked_at = null
      where id = ${row.id}`;
  });

  return chunks.length;
}
