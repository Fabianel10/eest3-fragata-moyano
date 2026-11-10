begin;

-- Métricas agregadas y sin identificadores personales. No se guardan IP,
-- user-agent, cookies, sesiones ni términos de búsqueda: solo día, tipo,
-- destino permitido y cantidad.
create table public.metrics_daily (
  day date not null default current_date,
  metric text not null check (metric in ('page_view', 'post_view', 'search_used')),
  target text not null default '' check (char_length(target) <= 80),
  career text not null default '' check (career in ('', 'informatica', 'madera', 'obras')),
  count bigint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, metric, target, career)
);
create index metrics_daily_metric on public.metrics_daily(metric, day desc);
alter table public.metrics_daily enable row level security;
revoke all on public.metrics_daily from public, anon, authenticated;

create function public.metrics_register(p_metric text, p_target text, p_career text default '')
returns void language plpgsql security definer set search_path = ''
as $$
declare allowed_pages constant text[] := array[
  'inicio', 'historia', 'galeria', 'calendario', 'informatica', 'madera', 'obras',
  'novedades', 'comunidad', 'privacidad', 'buscador', '404'
];
begin
  if p_metric is null or p_metric not in ('page_view', 'post_view', 'search_used') then
    raise exception 'Invalid metric' using errcode = '22023';
  end if;
  if p_career is null or p_career not in ('', 'informatica', 'madera', 'obras') then
    raise exception 'Invalid career' using errcode = '22023';
  end if;
  if p_metric = 'page_view' and (p_target is null or not (p_target = any(allowed_pages))) then
    raise exception 'Invalid page' using errcode = '22023';
  end if;
  if p_metric = 'search_used' and (p_target is null or p_target not in
    ('', 'pagina', 'carrera', 'comunicado', 'documento', 'proyecto', 'horario', 'evento')) then
    raise exception 'Invalid search filter' using errcode = '22023';
  end if;
  if p_metric = 'post_view' then
    if p_target is null or p_target !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or not exists (
        select 1 from public.institutional_posts p
        where p.id::text = p_target and p.published_at <= now()
          and (p.expires_at is null or p.expires_at > now())
      ) then
      raise exception 'Invalid post' using errcode = '22023';
    end if;
  end if;
  -- Retención acotada: se purga al registrar actividad.
  delete from public.metrics_daily where day < current_date - 365;
  insert into public.metrics_daily(day, metric, target, career, count)
  values (current_date, p_metric, coalesce(p_target, ''), coalesce(p_career, ''), 1)
  on conflict (day, metric, target, career) do update
    set count = public.metrics_daily.count + 1, updated_at = now();
end $$;
revoke all on function public.metrics_register(text, text, text) from public;
grant execute on function public.metrics_register(text, text, text) to anon, authenticated;

create function public.metrics_summary(p_days integer default 30)
returns table(metric text, target text, career text, total bigint, last_day date)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_cms_team() then
    raise exception 'Editorial team permission required' using errcode = '42501';
  end if;
  if p_days is null or p_days not between 1 and 365 then
    raise exception 'Invalid period' using errcode = '22023';
  end if;
  return query
    select m.metric, m.target, m.career, sum(m.count)::bigint, max(m.day)
    from public.metrics_daily m
    where m.day >= current_date - p_days + 1
    group by m.metric, m.target, m.career
    order by sum(m.count) desc, m.metric, m.target
    limit 200;
end $$;
revoke all on function public.metrics_summary(integer) from public, anon;
grant execute on function public.metrics_summary(integer) to authenticated;

comment on table public.metrics_daily is
  'Conteos diarios agregados. Sin IP, cookies, sesiones, user-agent ni términos de búsqueda. Retención: 365 días.';

commit;
