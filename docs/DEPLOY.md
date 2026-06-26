# Despliegue y conexiones — jul-IA

> Punteros operativos. **Sin secretos**: los valores viven en `.env.local` (local,
> gitignored) y en el almacén de variables de Render. El token de Render está en la
> variable de entorno local `MCP_RENDER_JULY`.

## Render (en producción)

- Servicio web: `srv-d8v88n68bjmc739n21o0` (`Jul-IA`, runtime node, rama `main`).
- URL: https://jul-ia-7pqo.onrender.com
- Dashboard: https://dashboard.render.com/web/srv-d8v88n68bjmc739n21o0
- Repo conectado: https://github.com/Sergiom84/Jul-IA (auto-deploy en push a `main`).

Llamadas a la API de Render (token en `MCP_RENDER_JULY`):

```bash
curl -H "Authorization: Bearer $MCP_RENDER_JULY" \
  https://api.render.com/v1/services/srv-d8v88n68bjmc739n21o0
```

### Variables de entorno requeridas en el servicio web

Las páginas dinámicas dan **500** si faltan. Copiar los valores desde `.env.local`:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `DATABASE_URL`, `CHAT_PROVIDER`, `OPENAI_API_KEY`,
`OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`, `ANTHROPIC_MODEL`, `REQUIRE_AUTH`.

> El worker de ingesta (`jul-ia-ingest` en `render.yaml`) es un servicio aparte de
> pago. Sin él, los documentos quedan en cola hasta procesarse.

## Supabase (compartido con GFiscal)

- Project ref: `yhnqdntfxeojhfgdvkva`. Valores en `.env.local` / `GFiscal/.env`.
- Migraciones por conexión directa: `node scripts/db.mjs migrate <fichero>`.
- Inspección: `node scripts/db.mjs inspect`.

## Git push (gotcha de este equipo)

Hay reglas `insteadOf` que reescriben https↔ssh. Para empujar por HTTPS con el
credential helper de `gh`:

```bash
git -c url.git@github.com:.insteadOf=__disabled_rewrite__ push origin main
```
