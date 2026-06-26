# jul-IA · Asesor fiscal y laboral con IA

Chatbot tipo "GPT personalizado" especializado en **fiscalidad, laboral y gestoría
en España**. Subes tu documentación (PDF, DOCX, TXT, MD), se analiza y el bot
responde **citando tus documentos** (RAG). Formato chat, mobile-first, desplegable
en Render.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase**: Postgres + **pgvector** (HNSW), Storage privado, Auth (email+contraseña)
- **Vercel AI SDK** (`ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`) — proveedor de
  chat **configurable** por entorno, con streaming
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims)
- **Worker de ingesta** independiente (extract → chunk → embed → store)

## Arquitectura

```
Navegador ──► Next.js (chat UI, /api/chat, /api/sources)
                  │
                  ├─ Supabase Auth + RLS (sesión por cookies)
                  ├─ Storage privado  bucket "julia-documents"  {user_id}/{source_id}/{file}
                  ├─ Postgres: conversations, messages, sources, source_chunks(vector)
                  └─ RPC match_source_chunks  (filtra por auth.uid() en SQL)

Worker (proceso aparte) ──► poll sources(status=uploaded)
                            └─ descarga de Storage → extrae → trocea → embeddings → source_chunks
```

Flujo de subida **asíncrono**: la subida solo guarda el fichero y crea la fila
`sources` (status `uploaded`); el worker la procesa con bloqueo
(`locked_at`/`attempt_count`/`next_attempt_at`) y recuperación de tareas atascadas.

## Puesta en marcha (local)

1. **Instalar dependencias**
   ```bash
   npm install
   ```
2. **Variables de entorno**: copia `.env.example` a `.env.local` y rellena Supabase +
   OpenAI/Anthropic. (Este proyecto reutiliza la BD Supabase de GFiscal.)
3. **Migración** (idempotente, aditiva): crea tablas, pgvector, RLS, RPC y bucket.
   ```bash
   node scripts/db.mjs inspect                       # comprobar estado / colisiones
   node scripts/db.mjs migrate 20260626120000_initial_schema.sql
   ```
4. **Usuario de prueba** (opcional, crea uno confirmado):
   ```bash
   node scripts/create-test-user.mjs qa@jul-ia.local mi-password
   ```
5. **Arrancar**
   ```bash
   npm run dev            # web en http://localhost:3000
   npm run worker:ingest  # worker de ingesta (otra terminal)
   ```

## Proveedor de IA

Configurable con `CHAT_PROVIDER`:
- `openai`  → `OPENAI_CHAT_MODEL` (p.ej. `gpt-4o`)
- `anthropic` → `ANTHROPIC_MODEL` (p.ej. `claude-sonnet-4-6`) + `ANTHROPIC_API_KEY`

Los **embeddings** usan siempre OpenAI (Anthropic no ofrece embeddings).

## Despliegue (Render)

`render.yaml` define dos servicios: **web** (Next.js) y **worker** (ingesta).
⚠️ Los Background Workers de Render son de **pago** (sin free tier). Configura las
variables `sync:false` en el panel y aplica la migración al proyecto Supabase.

## Scripts útiles

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run typecheck` | Comprobación de tipos |
| `npm run worker:ingest` | Worker de ingesta documental |
| `node scripts/db.mjs inspect\|migrate` | Inspección / migración de BD |

## Funciones

- **Chat con RAG**: responde citando tus documentos (chips de fuente).
- **Documentos**: PDF, DOCX, TXT, MD → indexados por el worker.
- **URLs de referencia**: añade URLs de fuentes oficiales (allowlist: BOE, AEAT,
  Seg. Social…). Se descargan, limpian e indexan con el mismo pipeline. Configurable
  con `REFERENCE_URL_ALLOWLIST`.
- **Búsqueda web** (toggle 🌐 en el composer): el modelo busca en internet con la
  web search nativa del proveedor y cita las URLs.
- **PWA**: instalable en móvil (manifest + service worker).

## Estado y siguientes pasos

**Corte 1 + Corte 2 (hechos):** chat + auth + RAG documental + URLs de referencia +
búsqueda web por proveedor + PWA, mobile-first.

**Siguiente:** integración final dentro de `GFiscal` (comparten Supabase y
`auth.users`).

> jul-IA ofrece orientación y **no sustituye** el asesoramiento profesional formal.
