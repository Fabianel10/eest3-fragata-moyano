begin;

-- Índice de búsqueda global. Combina contenido estático curado, publicaciones
-- institucionales vigentes y eventos del calendario publicado. La vista usa
-- security_invoker para respetar las políticas RLS de las tablas de origen.
create table public.search_static (
  id text primary key,
  kind text not null check (kind in ('pagina', 'carrera', 'evento')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  summary text not null default '' check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 2000),
  career text not null default '' check (career in ('', 'informatica', 'madera', 'obras')),
  url text not null check (url ~ '^[a-zA-Z0-9_-]+\.html$'),
  event_date date,
  updated_at timestamptz not null default now(),
  source text not null default 'static' check (source in ('static', 'calendar', 'career'))
);
create index search_static_kind on public.search_static(kind, event_date desc);
alter table public.search_static enable row level security;
revoke all on public.search_static from public, anon, authenticated;
grant select on public.search_static to anon, authenticated;
create policy search_static_public on public.search_static for select to anon, authenticated using (true);

insert into public.search_static(id,kind,title,summary,body,career,url,event_date,updated_at,source) values
  ('pagina:inicio', 'pagina', 'Inicio | EEST N°3 Fragata Moyano', 'Portal institucional, carreras técnicas, agenda, comunidad y contacto de la EEST N°3 de San Fernando.', 'inicio escuela técnica San Fernando historia carreras contacto', '', 'index.html', null, now(), 'static'),
  ('pagina:historia', 'pagina', 'Historia institucional', 'Hitos y memoria de la EEST N°3 Capitán de Fragata Carlos María Moyano.', 'historia 1914 escuela técnica memoria', '', 'historia.html', null, now(), 'static'),
  ('pagina:galeria', 'pagina', 'Galería institucional', 'Fotografías y videos de talleres, proyectos y vida institucional.', 'galería fotos videos talleres proyectos', '', 'galeria.html', null, now(), 'static'),
  ('pagina:calendario', 'pagina', 'Calendario institucional 2026', 'Feriados, fechas docentes, efemérides y agenda de la escuela.', 'calendario fechas feriados agenda', '', 'calendario.html', null, now(), 'static'),
  ('pagina:novedades', 'pagina', 'Comunicados y recursos', 'Comunicados, documentos, proyectos estudiantiles y horarios publicados.', 'comunicados documentos proyectos horarios', '', 'novedades.html', null, now(), 'static'),
  ('pagina:comunidad', 'pagina', 'Comunidad', 'Cuenta, acceso, preferencias y participación de la comunidad educativa.', 'comunidad cuenta registro preferencias', '', 'comunidad.html', null, now(), 'static'),
  ('pagina:privacidad', 'pagina', 'Privacidad de la comunidad', 'Tratamiento de datos, notificaciones internas e historial de Skynet.', 'privacidad datos personales', '', 'privacidad.html', null, now(), 'static'),
  ('pagina:buscador', 'pagina', 'Buscar en el sitio', 'Buscador de comunicados, documentos, carreras, páginas y calendario.', 'buscar buscador comunicados carreras calendario', '', 'buscador.html', null, now(), 'static'),
  ('carrera:informatica', 'carrera', 'Informática Personal y Profesional', 'Formación en soporte, redes, sistemas, seguridad y desarrollo de soluciones informáticas.', 'informática software redes sistemas seguridad', 'informatica', 'informatica.html', null, now(), 'career'),
  ('carrera:madera', 'carrera', 'Industrialización de la Madera y el Mueble', 'Diseño, producción, materiales, equipos e instalación de muebles y carpintería.', 'madera mueble carpintería diseño producción', 'madera', 'madera.html', null, now(), 'career'),
  ('carrera:obras', 'carrera', 'Maestro Mayor de Obras', 'Proyectos edilicios, documentación técnica y gestión de procesos constructivos.', 'obras construcción planos proyectos', 'obras', 'obras.html', null, now(), 'career'),
  ('evento:2026-01-01:Año Nuevo', 'evento', 'Año Nuevo', 'Feriado', '', '', 'calendario.html', '2026-01-01', now(), 'calendar'),
  ('evento:2026-02-16:Carnaval', 'evento', 'Carnaval', 'Feriado', '', '', 'calendario.html', '2026-02-16', now(), 'calendar'),
  ('evento:2026-02-17:Carnaval', 'evento', 'Carnaval', 'Feriado', '', '', 'calendario.html', '2026-02-17', now(), 'calendar'),
  ('evento:2026-02-18:Jornada institucional docente', 'evento', 'Jornada institucional docente', 'Calendario docente', '', '', 'calendario.html', '2026-02-18', now(), 'calendar'),
  ('evento:2026-03-02:Inicio de clases', 'evento', 'Inicio de clases', 'Calendario docente', '', '', 'calendario.html', '2026-03-02', now(), 'calendar'),
  ('evento:2026-03-08:Día Internacional de las Mujeres', 'evento', 'Día Internacional de las Mujeres', 'Efeméride', '', '', 'calendario.html', '2026-03-08', now(), 'calendar'),
  ('evento:2026-03-24:Día Nacional de la Memoria por la Verdad y la Justicia', 'evento', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'Feriado', '', '', 'calendario.html', '2026-03-24', now(), 'calendar'),
  ('evento:2026-04-02:Día del Veterano y de los Caídos en la Guerra de Malvinas', 'evento', 'Día del Veterano y de los Caídos en la Guerra de Malvinas', 'Feriado', '', '', 'calendario.html', '2026-04-02', now(), 'calendar'),
  ('evento:2026-04-03:Viernes Santo', 'evento', 'Viernes Santo', 'Feriado', '', '', 'calendario.html', '2026-04-03', now(), 'calendar'),
  ('evento:2026-05-01:Día del Trabajador', 'evento', 'Día del Trabajador', 'Feriado', '', '', 'calendario.html', '2026-05-01', now(), 'calendar'),
  ('evento:2026-05-25:Revolución de Mayo', 'evento', 'Revolución de Mayo', 'Feriado', '', '', 'calendario.html', '2026-05-25', now(), 'calendar'),
  ('evento:2026-06-05:Día Mundial del Ambiente', 'evento', 'Día Mundial del Ambiente', 'Efeméride', '', '', 'calendario.html', '2026-06-05', now(), 'calendar'),
  ('evento:2026-06-15:Paso a la Inmortalidad de Martín Miguel de Güemes', 'evento', 'Paso a la Inmortalidad de Martín Miguel de Güemes', 'Feriado', '', '', 'calendario.html', '2026-06-15', now(), 'calendar'),
  ('evento:2026-06-20:Paso a la Inmortalidad de Manuel Belgrano', 'evento', 'Paso a la Inmortalidad de Manuel Belgrano', 'Feriado', '', '', 'calendario.html', '2026-06-20', now(), 'calendar'),
  ('evento:2026-07-09:Día de la Independencia', 'evento', 'Día de la Independencia', 'Feriado', '', '', 'calendario.html', '2026-07-09', now(), 'calendar'),
  ('evento:2026-07-20:Receso escolar de invierno', 'evento', 'Receso escolar de invierno', 'Calendario docente', '', '', 'calendario.html', '2026-07-20', now(), 'calendar'),
  ('evento:2026-08-17:Paso a la Inmortalidad de José de San Martín', 'evento', 'Paso a la Inmortalidad de José de San Martín', 'Feriado', '', '', 'calendario.html', '2026-08-17', now(), 'calendar'),
  ('evento:2026-09-07:Semana de proyectos de Educación Técnica', 'evento', 'Semana de proyectos de Educación Técnica', 'Educación técnica', '', '', 'calendario.html', '2026-09-07', now(), 'calendar'),
  ('evento:2026-09-11:Día del Maestro', 'evento', 'Día del Maestro', 'Calendario docente', '', '', 'calendario.html', '2026-09-11', now(), 'calendar'),
  ('evento:2026-09-16:Día de los Derechos de los Estudiantes Secundarios', 'evento', 'Día de los Derechos de los Estudiantes Secundarios', 'Efeméride', '', '', 'calendario.html', '2026-09-16', now(), 'calendar'),
  ('evento:2026-09-21:Día del Estudiante', 'evento', 'Día del Estudiante', 'Fecha local', '', '', 'calendario.html', '2026-09-21', now(), 'calendar'),
  ('evento:2026-10-12:Día del Respeto a la Diversidad Cultural', 'evento', 'Día del Respeto a la Diversidad Cultural', 'Feriado', '', '', 'calendario.html', '2026-10-12', now(), 'calendar'),
  ('evento:2026-10-16:Día Mundial de la Alimentación', 'evento', 'Día Mundial de la Alimentación', 'Efeméride', '', '', 'calendario.html', '2026-10-16', now(), 'calendar'),
  ('evento:2026-11-10:Día de la Tradición', 'evento', 'Día de la Tradición', 'Efeméride', '', '', 'calendario.html', '2026-11-10', now(), 'calendar'),
  ('evento:2026-11-15:Día de la Educación Técnica', 'evento', 'Día de la Educación Técnica', 'Educación técnica', '', '', 'calendario.html', '2026-11-15', now(), 'calendar'),
  ('evento:2026-11-23:Día de la Soberanía Nacional', 'evento', 'Día de la Soberanía Nacional', 'Feriado', '', '', 'calendario.html', '2026-11-23', now(), 'calendar'),
  ('evento:2026-12-07:Día no laborable con fines turísticos', 'evento', 'Día no laborable con fines turísticos', 'Fecha turística', '', '', 'calendario.html', '2026-12-07', now(), 'calendar'),
  ('evento:2026-12-08:Inmaculada Concepción de María', 'evento', 'Inmaculada Concepción de María', 'Feriado', '', '', 'calendario.html', '2026-12-08', now(), 'calendar'),
  ('evento:2026-12-10:Día de los Derechos Humanos', 'evento', 'Día de los Derechos Humanos', 'Efeméride', '', '', 'calendario.html', '2026-12-10', now(), 'calendar'),
  ('evento:2026-12-18:Asueto municipal de San Fernando', 'evento', 'Asueto municipal de San Fernando', 'Fecha local', '', '', 'calendario.html', '2026-12-18', now(), 'calendar'),
  ('evento:2026-12-22:Finalización del ciclo lectivo', 'evento', 'Finalización del ciclo lectivo', 'Calendario docente', '', '', 'calendario.html', '2026-12-22', now(), 'calendar'),
  ('evento:2026-12-25:Navidad', 'evento', 'Navidad', 'Feriado', '', '', 'calendario.html', '2026-12-25', now(), 'calendar')
on conflict (id) do update set title=excluded.title, summary=excluded.summary, body=excluded.body,
  career=excluded.career, url=excluded.url, event_date=excluded.event_date, source=excluded.source;

create function public.cms_search_sync()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.search_static set
    title = coalesce(nullif(btrim(new.content ->> 'title'), ''), title),
    summary = left(coalesce(new.content ->> 'description', ''), 500),
    body = left(coalesce(new.content ->> 'title', '') || ' ' || coalesce(new.content ->> 'description', ''), 2000),
    updated_at = now()
  where id = 'pagina:' || new.slug;
  return new;
end $$;
revoke all on function public.cms_search_sync() from public, anon, authenticated;
drop trigger if exists cms_search_sync on public.cms_published;
create trigger cms_search_sync after insert or update on public.cms_published
  for each row execute function public.cms_search_sync();

-- Sincroniza las publicaciones que ya existían antes de esta migración.
update public.search_static s set
  title = coalesce(nullif(btrim(p.content ->> 'title'), ''), s.title),
  summary = left(coalesce(p.content ->> 'description', ''), 500),
  body = left(coalesce(p.content ->> 'title', '') || ' ' || coalesce(p.content ->> 'description', ''), 2000),
  updated_at = now()
from public.cms_published p
where s.id = 'pagina:' || p.slug;

create view public.search_index
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
)
select id, kind, title, summary, body, career, url, result_date, published_at, source from static_docs
union
select id, kind, title, summary, body, career, url, result_date, published_at, source from post_docs_named
union
select id, kind, title, summary, body, career, url, result_date, published_at, source from calendar_docs_named;

revoke all on public.search_index from public, anon, authenticated;
grant select on public.search_index to anon, authenticated;

commit;
