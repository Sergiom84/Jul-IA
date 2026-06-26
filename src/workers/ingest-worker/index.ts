// Worker de ingesta documental.
// Hace poll de `sources` (status=uploaded), bloquea con FOR UPDATE SKIP LOCKED,
// extrae → trocea → embebe → inserta en source_chunks, y marca ready/error.
// Recupera fuentes atascadas en 'processing' tras un reinicio.
import "./env"; // DEBE ir primero: carga el entorno antes de leer config.
import postgres from "postgres";
import { getAdminClient } from "../../lib/supabase/admin";
import { runIngest } from "../../lib/ingest/process-source";

const POLL_MS = Number(process.env.INGEST_POLL_INTERVAL_MS ?? 3000);
const MAX_ATTEMPTS = Number(process.env.INGEST_MAX_ATTEMPTS ?? 3);
const LOCK_TIMEOUT = Number(process.env.INGEST_LOCK_TIMEOUT_SECONDS ?? 300);
const MAX_CHUNK_CHARS = Number(process.env.INGEST_MAX_CHUNK_CHARS ?? 4000);
const BACKOFF_BASE = 30; // segundos

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[worker] Falta DATABASE_URL");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 2 });
const storage = getAdminClient().storage;

type SourceRow = {
  id: string;
  user_id: string;
  type: "document" | "url" | "official_site";
  title: string | null;
  file_name: string | null;
  storage_path: string | null;
  url: string | null;
  attempt_count: number;
};

/** Re-encola fuentes bloqueadas en 'processing' demasiado tiempo. */
async function recoverStuck() {
  const rows = await sql<{ id: string }[]>`
    update public.sources
    set status = 'uploaded', locked_at = null
    where status = 'processing'
      and locked_at is not null
      and locked_at < now() - (${LOCK_TIMEOUT} || ' seconds')::interval
    returning id`;
  if (rows.length) console.log(`[worker] recuperadas ${rows.length} atascadas`);
}

/** Toma la siguiente fuente pendiente de forma atómica. */
async function claimNext(): Promise<SourceRow | null> {
  const rows = await sql<SourceRow[]>`
    update public.sources s
    set status = 'processing', locked_at = now(), attempt_count = s.attempt_count + 1
    where s.id = (
      select id from public.sources
      where type in ('document', 'url', 'official_site')
        and status = 'uploaded'
        and (next_attempt_at is null or next_attempt_at <= now())
      order by created_at
      for update skip locked
      limit 1
    )
    returning s.id, s.user_id, s.type, s.title, s.file_name,
              s.storage_path, s.url, s.attempt_count`;
  return rows[0] ?? null;
}

async function markFailure(row: SourceRow, message: string) {
  if (row.attempt_count >= MAX_ATTEMPTS) {
    await sql`
      update public.sources
      set status = 'error', error = ${message}, locked_at = null
      where id = ${row.id}`;
    console.error(`[worker] ${row.id} ERROR definitivo: ${message}`);
  } else {
    const backoff = BACKOFF_BASE * row.attempt_count;
    await sql`
      update public.sources
      set status = 'uploaded', error = ${message}, locked_at = null,
          next_attempt_at = now() + (${backoff} || ' seconds')::interval
      where id = ${row.id}`;
    console.warn(
      `[worker] ${row.id} fallo (intento ${row.attempt_count}), reintento en ${backoff}s: ${message}`,
    );
  }
}

async function processSource(row: SourceRow) {
  const n = await runIngest(row, sql, storage, MAX_CHUNK_CHARS);
  console.log(`[worker] ${row.id} listo · ${n} fragmentos`);
}

let running = true;
process.on?.("SIGINT", () => (running = false));
process.on?.("SIGTERM", () => (running = false));

async function loop() {
  console.log("[worker] ingesta arrancada");
  while (running) {
    try {
      await recoverStuck();
      const row = await claimNext();
      if (!row) {
        await sleep(POLL_MS);
        continue;
      }
      try {
        await processSource(row);
      } catch (err) {
        await markFailure(row, err instanceof Error ? err.message : String(err));
      }
    } catch (err) {
      console.error("[worker] error de bucle:", err);
      await sleep(POLL_MS);
    }
  }
  await sql.end();
  console.log("[worker] detenido");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

loop();
