-- ------------------------------------------------------------
-- sources.category
-- Distingue la base de conocimiento (RAG) de los documentos subidos
-- para gestión puntual (p.ej. una factura a escanear). Las filas
-- existentes quedan como 'knowledge' (comportamiento previo).
-- ------------------------------------------------------------
alter table public.sources
  add column if not exists category text not null default 'knowledge'
    check (category in ('knowledge', 'upload'));

-- Listados por pestaña: filtrar por usuario + categoría rápido.
create index if not exists sources_user_category_idx
  on public.sources (user_id, category);
