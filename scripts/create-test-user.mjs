// Crea (o reusa) un usuario de prueba confirmado para QA local.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const txt = readFileSync(join(root, ".env.local"), "utf8");
const env = {};
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const email = process.argv[2] || "qa@jul-ia.local";
const password = process.argv[3] || "julia-test-2026";

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  if (/already/i.test(error.message)) {
    console.log("Usuario ya existe:", email);
  } else {
    console.error("ERROR:", error.message);
    process.exit(1);
  }
} else {
  console.log("Creado:", email, "id:", data.user.id);
}
console.log("Login:", email, "/", password);
