-- El RAG solo debe usar fragmentos de fuentes ya procesadas ('ready'),
-- nunca de fuentes en 'processing'/'error' (chunks viejos o parciales).
set search_path = public, extensions;

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
    and s.status = 'ready'
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
