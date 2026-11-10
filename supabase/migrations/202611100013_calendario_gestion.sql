begin;

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  type text not null check (type in ('feriado', 'local', 'docente', 'turistico', 'efemeride', 'tecnica')),
  description text not null default '' check (char_length(description) <= 2000),
  source text not null default '' check (char_length(source) <= 300),
  responsible text not null default '' check (char_length(responsible) <= 200),
  published boolean not null default false,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (event_date between date '2000-01-01' and date '2100-12-31')
);
create index calendar_events_year on public.calendar_events(event_date, published);
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from public, anon, authenticated;
grant select on public.calendar_events to anon, authenticated;
create policy calendar_events_public on public.calendar_events for select to anon, authenticated
  using (published);
create policy calendar_events_admin on public.calendar_events for select to authenticated
  using ((select public.is_community_admin()));

create or replace function public.calendar_event_save(event_id uuid, expected_version integer, document jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare saved public.calendar_events; fecha date;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if event_id is null or expected_version is null or expected_version < 0
    or jsonb_typeof(document) is distinct from 'object' then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  fecha := (document ->> 'event_date')::date;
  if fecha is null or fecha < date '2000-01-01' or fecha > date '2100-12-31'
    or coalesce(document ->> 'title', '') !~ '[^[:space:]]'
    or char_length(btrim(document ->> 'title')) not between 1 and 300
    or coalesce(document ->> 'type', '') not in ('feriado', 'local', 'docente', 'turistico', 'efemeride', 'tecnica')
    or char_length(coalesce(document ->> 'description', '')) > 2000
    or char_length(coalesce(document ->> 'source', '')) > 300
    or char_length(coalesce(document ->> 'responsible', '')) > 200 then
    raise exception 'Invalid event fields' using errcode = '22023';
  end if;
  if expected_version = 0 then
    insert into public.calendar_events(id, event_date, title, type, description, source, responsible, published, updated_by)
    values (event_id, fecha, btrim(document ->> 'title'), document ->> 'type',
      coalesce(document ->> 'description', ''), coalesce(document ->> 'source', ''),
      coalesce(document ->> 'responsible', ''), coalesce((document ->> 'published')::boolean, false), auth.uid())
    returning * into saved;
  else
    update public.calendar_events set
      event_date = fecha, title = btrim(document ->> 'title'), type = document ->> 'type',
      description = coalesce(document ->> 'description', ''), source = coalesce(document ->> 'source', ''),
      responsible = coalesce(document ->> 'responsible', ''),
      published = coalesce((document ->> 'published')::boolean, published),
      version = version + 1, updated_at = now(), updated_by = auth.uid()
    where id = event_id and version = expected_version
    returning * into saved;
    if not found then raise exception 'Concurrent update or missing event' using errcode = '40001'; end if;
  end if;
  return to_jsonb(saved);
end $$;
revoke all on function public.calendar_event_save(uuid, integer, jsonb) from public, anon;
grant execute on function public.calendar_event_save(uuid, integer, jsonb) to authenticated;

create or replace function public.calendar_event_delete(event_id uuid, expected_version integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  delete from public.calendar_events where id = event_id and version = expected_version;
  if not found then raise exception 'Concurrent update or missing event' using errcode = '40001'; end if;
end $$;
revoke all on function public.calendar_event_delete(uuid, integer) from public, anon;
grant execute on function public.calendar_event_delete(uuid, integer) to authenticated;

-- La búsqueda global incorpora los eventos gestionados publicados.
create or replace view public.search_index
with (security_invoker = true) as
with published_calendar as (
  select exists(
    select 1 from public.cms_published p
    where p.slug in ('inicio', 'calendario')
      and jsonb_array_length(coalesce(p.content -> 'modules' -> 'events', '[]'::jsonb)) > 0
  ) as exists
),
static_docs as (
  select s.id, s.kind, s.title, s.summary, s.body, s.career, s.url,
    s.event_date as result_date, s.updated_at as published_at, s.source
  from public.search_static s, published_calendar c
  where s.kind <> 'evento' or not c.exists
),
post_docs as (
  select 'post:' || p.id::text, p.kind::text, p.title, left(p.body, 500), p.body, p.career,
    'novedades.html?post=' || p.id::text, p.published_at::date, p.published_at, 'post'
  from public.institutional_posts p
  where p.published_at <= now() and (p.expires_at is null or p.expires_at > now())
),
post_docs_named as (
  select * from post_docs as t(id, kind, title, summary, body, career, url, result_date, published_at, source)
),
calendar_docs as (
  select 'evento:' || coalesce(e ->> 'date', '') || ':' || coalesce(e ->> 'title', ''),
    'evento', e ->> 'title', left(coalesce(e ->> 'description', ''), 500),
    coalesce(e ->> 'description', ''), '', 'calendario.html',
    (e ->> 'date')::date, null::timestamptz, 'calendar'
  from public.cms_published p
  cross join lateral jsonb_array_elements(coalesce(p.content -> 'modules' -> 'events', '[]'::jsonb)) e
  where p.slug in ('inicio', 'calendario') and e ->> 'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
),
calendar_docs_named as (
  select * from calendar_docs as t(id, kind, title, summary, body, career, url, result_date, published_at, source)
),
managed_docs as (
  select 'evento:db:' || e.id::text, 'evento', e.title, left(e.description, 500), e.description,
    '', 'calendario.html', e.event_date, null::timestamptz, 'calendar'
  from public.calendar_events e where e.published
),
managed_docs_named as (
  select * from managed_docs as t(id, kind, title, summary, body, career, url, result_date, published_at, source)
)
select id, kind, title, summary, body, career, url, result_date, published_at, source from static_docs
union
select id, kind, title, summary, body, career, url, result_date, published_at, source from post_docs_named
union
select id, kind, title, summary, body, career, url, result_date, published_at, source from calendar_docs_named
union
select id, kind, title, summary, body, career, url, result_date, published_at, source from managed_docs_named;
revoke all on public.search_index from public, anon, authenticated;
grant select on public.search_index to anon, authenticated;

commit;
