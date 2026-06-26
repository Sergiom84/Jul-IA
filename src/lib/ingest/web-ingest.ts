// Procesado de fuentes DENTRO del servicio web (sin worker aparte).
// Se invoca con `after()` tras la subida: la respuesta vuelve rápido y el
// procesado sigue en el servidor persistente de Render. SOLO servidor.
import postgres, { type Sql } from "postgres";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { runIngest, type IngestRow } from "./process-source";

const MAX_CHUNK_CHARS = Number(process.env.INGEST_MAX_CHUNK_CHARS ?? 4000);

// Cliente Postgres reutilizado entre peticiones (servidor de larga vida).
let _sql: Sql | null = null;
function getSql(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL");
    _sql = postgres(url, { prepare: false, max: 3 });
  }
  return _sql;
}

/**
 * Procesa una fuente por id: marca processing → runIngest → ready, o error.
 * No lanza: registra el fallo en la fila para que la UI lo muestre.
 */
export async function processSourceInline(id: string): Promise<void> {
  const sql = getSql();
  try {
    const rows = await sql<IngestRow[]>`
      update public.sources
      set status = 'processing', locked_at = now(), attempt_count = attempt_count + 1
      where id = ${id}
      returning id, user_id, type, title, file_name, storage_path, url`;
    const row = rows[0];
    if (!row) return;

    const storage = getAdminClient().storage;
    const n = await runIngest(row, sql, storage, MAX_CHUNK_CHARS);
    console.log(`[web-ingest] ${id} listo · ${n} fragmentos`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[web-ingest] ${id} error: ${message}`);
    await sql`
      update public.sources
      set status = 'error', error = ${message}, locked_at = null
      where id = ${id}`.catch(() => {});
  }
}
