-- ============================================================
-- jul-IA · Esquema inicial
-- Chat + RAG documental: conversations, messages, sources, source_chunks.
-- pgvector (HNSW), RLS por usuario, RPC endurecida y Storage privado.
-- ============================================================

-- pgvector en el esquema extensions (recomendado por Supabase).
create extension if not exists vector with schema extensions;

-- Durante la migración resolvemos tipos/opclasses de vector sin cualificar.
set search_path = public, extensions;

-- ------------------------------------------------------------
-- Utilidad: updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- conversations
-- ------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- 'incomplete' marca respuestas cuyo stream se cortó a media.
  status text not null default 'complete' check (status in ('complete', 'incomplete')),
  -- citas/fuentes usadas (array de {source_id, title, type}).
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ------------------------------------------------------------
-- sources  (documentos subidos · URLs de referencia · sitios oficiales)
-- ------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('document', 'url', 'official_site')),
  title text,
  file_name text,
  mime_type text,
  storage_path text,
  url text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'ready', 'error')),
  error text,
  chunk_count integer not null default 0,
  -- control del worker de ingesta
  attempt_count integer not null default 0,
  locked_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_user_status_idx on public.sources (user_id, status);
-- Cola del worker: buscar pendientes / reintentos vencidos rápido.
create index sources_worker_idx on public.sources (status, next_attempt_at);

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- source_chunks  (trozos vectorizados de cualquier fuente)
-- user_id desnormalizado: RLS simple y filtro directo en la RPC.
-- ------------------------------------------------------------
create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index source_chunks_source_idx on public.source_chunks (source_id);
create index source_chunks_user_idx on public.source_chunks (user_id);

-- Índice ANN HNSW (cosine) — recomendado por Supabase frente a IVFFlat.
create index source_chunks_embedding_hnsw_idx
  on public.source_chunks
  using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- RLS
-- ============================================================
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sources enable row level security;
alter table public.source_chunks enable row level security;

-- conversations: el dueño gestiona lo suyo.
create policy conversations_owner_all on public.conversations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- messages: acceso vía propiedad de la conversación.
create policy messages_owner_all on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

-- sources: el dueño gestiona lo suyo.
create policy sources_owner_all on public.sources
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- source_chunks: lectura del dueño. La escritura la hace el worker con la
-- secret key (bypassa RLS); no se exponen políticas de insert al cliente.
create policy source_chunks_owner_select on public.source_chunks
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- RPC de búsqueda vectorial — ENDURECIDA
--   · No recibe user_id del cliente: usa auth.uid() interno.
--   · security definer + search_path vacío + referencias cualificadas.
--   · execute revocado a public/anon; solo authenticated.
-- ============================================================
create or replace function public.match_source_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 6,
  min_similarity double precision default 0.0
)
returns table (
  id uuid,
  source_id uuid,
  source_title text,
  source_type text,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sc.id,
    sc.source_id,
    s.title as source_title,
    s.type as source_type,
    sc.chunk_index,
    sc.content,
    1 - (sc.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.source_chunks sc
  join public.sources s on s.id = sc.source_id
  where sc.user_id = (select auth.uid())
    and sc.embedding is not null
    and (1 - (sc.embedding operator(extensions.<=>) query_embedding)) >= min_similarity
  order by sc.embedding operator(extensions.<=>) query_embedding
  limit greatest(match_count, 1);
$$;

revoke all on function
  public.match_source_chunks(extensions.vector, integer, double precision)
  from public, anon;

grant execute on function
  public.match_source_chunks(extensions.vector, integer, double precision)
  to authenticated;

-- ============================================================
-- Storage privado: bucket 'julia-documents'
--   (nombre dedicado para no chocar con el bucket 'document-files' de GFiscal)
--   Rutas forzadas: {user_id}/{source_id}/{filename}
--   Políticas: la primera carpeta debe ser el uid del usuario.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('julia-documents', 'julia-documents', false)
on conflict (id) do nothing;

create policy julia_documents_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'julia-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy julia_documents_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'julia-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy julia_documents_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'julia-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'julia-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy julia_documents_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'julia-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
