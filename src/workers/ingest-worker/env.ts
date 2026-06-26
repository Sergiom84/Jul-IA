// Carga .env(.local) ANTES que cualquier otro import (config.ts lee process.env
// en tiempo de import). Debe ser el primer import del worker.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

for (const file of [".env.local", ".env"]) {
  try {
    const txt = readFileSync(join(root, file), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* fichero ausente: OK */
  }
}
