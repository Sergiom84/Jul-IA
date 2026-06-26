// Inspección y aplicación de migraciones por conexión directa a Postgres.
// Uso:
//   node scripts/db.mjs inspect           -> comprueba colisiones / extensiones
//   node scripts/db.mjs migrate <fichero> -> aplica un .sql (en transacción)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

// Carga .env.local de forma simple (sin dependencias).
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(join(root, file), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    } catch {}
  }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

const cmd = process.argv[2];

async function inspect() {
  const ext = await sql`
    select e.extname, n.nspname as schema
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'vector'`;
  console.log("vector extension:", ext.length ? ext[0] : "NO instalada");

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in ('conversations','messages','sources','source_chunks')
    order by table_name`;
  console.log("tablas que ya existen (colisión):", tables.map((t) => t.table_name));

  const buckets = await sql`select id from storage.buckets order by id`;
  console.log("buckets:", buckets.map((b) => b.id));

  const pols = await sql`
    select polname from pg_policy
    where polname like 'julia_documents_%'`;
  console.log("políticas julia_documents_* existentes:", pols.map((p) => p.polname));

  const fn = await sql`
    select proname from pg_proc where proname = 'match_source_chunks'`;
  console.log("función match_source_chunks existe:", fn.length > 0);

  await sql.end();
}

async function migrate(file) {
  const path = file.includes("/") || file.includes("\\")
    ? file
    : join(root, "supabase", "migrations", file);
  const content = readFileSync(path, "utf8");
  console.log("Aplicando:", path);
  await sql.begin(async (tx) => {
    await tx.unsafe(content);
  });
  console.log("OK ✔");
  await sql.end();
}

try {
  if (cmd === "inspect") await inspect();
  else if (cmd === "migrate") await migrate(process.argv[3]);
  else {
    console.error("Comando desconocido. Usa: inspect | migrate <fichero>");
    process.exit(1);
  }
} catch (err) {
  console.error("ERROR:", err.message);
  await sql.end();
  process.exit(1);
}
