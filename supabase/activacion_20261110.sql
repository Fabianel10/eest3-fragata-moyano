-- Activación completa del incremento v1.10.0 (2026-11-10).
-- Aplicar UNA sola vez en Supabase → SQL Editor, en este orden.
-- No reejecutar si las migraciones 8 a 11 ya fueron aplicadas.

-- ============================================================
-- 202611100008_equipo_editorial.sql
-- ============================================================
begin;

-- 1. Roles institucionales del equipo editorial.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('comunidad', 'alumno', 'profesor', 'editor', 'revisor', 'administrador'));

create or replace function public.cms_role()
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), '');
$$;

create or replace function public.is_cms_team()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.cms_role() in ('editor', 'revisor', 'administrador'); $$;

create or replace function public.is_cms_editor()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.cms_role() in ('editor', 'administrador'); $$;

create or replace function public.is_cms_reviewer()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.cms_role() in ('revisor', 'administrador'); $$;

revoke all on function public.cms_role(), public.is_cms_team(),
  public.is_cms_editor(), public.is_cms_reviewer() from public, anon;
grant execute on function public.cms_role(), public.is_cms_team(),
  public.is_cms_editor(), public.is_cms_reviewer() to authenticated;

-- El equipo puede consultar nombres y roles para trazabilidad, sin exponer
-- datos de cuentas a la comunidad general.
create policy profiles_read_team on public.profiles for select to authenticated
  using ((select public.is_cms_team()));

create table public.profile_role_history (
  id bigint generated always as identity primary key,
  profile_id uuid not null references auth.users(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  previous_role text not null,
  new_role text not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index profile_role_history_profile on public.profile_role_history(profile_id, id desc);
alter table public.profile_role_history enable row level security;
revoke all on public.profile_role_history from public, anon, authenticated;
grant select on public.profile_role_history to authenticated;
create policy profile_role_history_admin on public.profile_role_history for select to authenticated
  using ((select public.is_community_admin()));

create or replace function public.profile_role_set(target_id uuid, new_role text, note text default '')
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare current public.profiles; previous_role text;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if target_id is null or new_role is null or new_role not in
    ('comunidad', 'alumno', 'profesor', 'editor', 'revisor', 'administrador') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;
  if char_length(coalesce(note, '')) > 500 then
    raise exception 'Invalid note' using errcode = '22023';
  end if;
  select * into current from public.profiles where id = target_id for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if target_id = auth.uid() and new_role <> current.role then
    raise exception 'No podés cambiar tu propio rol' using errcode = '42501';
  end if;
  if current.role = 'administrador' and new_role <> 'administrador'
    and (select count(*) from public.profiles where role = 'administrador') <= 1 then
    raise exception 'Debe existir al menos una cuenta administradora' using errcode = '22023';
  end if;
  if new_role = current.role then return current; end if;
  previous_role := current.role;
  update public.profiles set role = new_role, updated_at = now()
    where id = target_id returning * into current;
  insert into public.profile_role_history(profile_id, actor, previous_role, new_role, note)
    values(target_id, auth.uid(), previous_role, new_role, btrim(coalesce(note, '')));
  return current;
end $$;
revoke all on function public.profile_role_set(uuid, text, text) from public, anon;
grant execute on function public.profile_role_set(uuid, text, text) to authenticated;

-- 2. Estado de revisión por página y trazabilidad de publicación.
alter table public.cms_pages
  add column status text not null default 'borrador'
    check (status in ('borrador', 'en_revision', 'aprobado', 'rechazado', 'publicado')),
  add column review_note text check (review_note is null or char_length(review_note) <= 2000),
  add column submitted_by uuid references auth.users(id) on delete set null,
  add column submitted_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz;
create index cms_pages_status on public.cms_pages(status, updated_at desc);

alter table public.cms_revisions
  add column actor_role text,
  add column note text check (note is null or char_length(note) <= 2000);
alter table public.cms_revisions drop constraint if exists cms_revisions_action_check;
alter table public.cms_revisions add constraint cms_revisions_action_check
  check (action in ('save', 'submit', 'approve', 'reject', 'publish', 'restore'));

alter table public.cms_published
  add column published_by uuid references auth.users(id) on delete set null,
  add column approved_by uuid references auth.users(id) on delete set null,
  add column review_note text;

-- La lectura pública no necesita conocer identificadores del equipo.
revoke select on public.cms_published from anon, authenticated;
grant select (slug, content, version, published_at) on public.cms_published to anon;
grant select on public.cms_published to authenticated;

drop policy if exists cms_drafts_admin on public.cms_pages;
create policy cms_drafts_team on public.cms_pages for select to authenticated
  using ((select public.is_cms_team()));
drop policy if exists cms_history_admin on public.cms_revisions;
create policy cms_history_team on public.cms_revisions for select to authenticated
  using ((select public.is_cms_team()));

drop policy if exists cms_media_read on public.cms_media;
create policy cms_media_read on public.cms_media for select to authenticated
  using ((select public.is_cms_team()));
drop policy if exists cms_media_insert on public.cms_media;
create policy cms_media_insert on public.cms_media for insert to authenticated
  with check ((select public.is_cms_editor()) and created_by = (select auth.uid()));
drop policy if exists cms_media_update on public.cms_media;
create policy cms_media_update on public.cms_media for update to authenticated
  using ((select public.is_cms_editor())) with check ((select public.is_cms_editor()));
drop policy if exists cms_storage_upload on storage.objects;
create policy cms_storage_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'institutional-media' and (select public.is_cms_editor())
    and name ~ '^[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|mp3)$');

create or replace function public.cms_save_draft(page_slug text, document jsonb, expected_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare page public.cms_pages;
begin
  if not public.is_cms_editor() then
    raise exception 'Editor permission required' using errcode = '42501';
  end if;
  if page_slug is null or page_slug not in ('inicio', 'historia', 'galeria', 'calendario',
    'informatica', 'madera', 'obras') or expected_version is null or expected_version < 0 then
    raise exception 'Invalid page or version' using errcode = '22023';
  end if;
  perform public.cms_validate_document(document);
  perform public.cms_validate_template(page_slug, document);
  if expected_version = 0 then
    insert into public.cms_pages(slug, draft, version, updated_by)
    values (page_slug, document, 1, auth.uid()) on conflict do nothing;
    if found then
      insert into public.cms_revisions(slug, content, version, action, created_by, actor_role)
      values (page_slug, document, 1, 'save', auth.uid(), public.cms_role());
      select * into page from public.cms_pages where slug = page_slug;
      return to_jsonb(page);
    end if;
  end if;
  select * into page from public.cms_pages where slug = page_slug for update;
  if not found or page.version <> expected_version then
    raise exception 'Editorial version conflict' using errcode = '40001';
  end if;
  if page.status = 'en_revision' and not public.is_community_admin() then
    raise exception 'Page is under review' using errcode = '42501';
  end if;
  update public.cms_pages set
    draft = document, version = version + 1, updated_at = now(), updated_by = auth.uid(),
    status = 'borrador', review_note = null, submitted_by = null, submitted_at = null,
    reviewed_by = null, reviewed_at = null
  where slug = page_slug returning * into page;
  insert into public.cms_revisions(slug, content, version, action, created_by, actor_role)
  values (page_slug, document, page.version, 'save', auth.uid(), public.cms_role());
  return to_jsonb(page);
end $$;

create or replace function public.cms_submit_review(page_slug text, expected_version integer, note text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare page public.cms_pages;
begin
  if not public.is_cms_editor() then
    raise exception 'Editor permission required' using errcode = '42501';
  end if;
  if char_length(coalesce(note, '')) > 2000 then
    raise exception 'Invalid note' using errcode = '22023';
  end if;
  select * into page from public.cms_pages where slug = page_slug for update;
  if not found or expected_version is null or page.version <> expected_version then
    raise exception 'Editorial version conflict' using errcode = '40001';
  end if;
  if page.status not in ('borrador', 'rechazado') then
    raise exception 'Page is not ready to submit' using errcode = '22023';
  end if;
  perform public.cms_validate_document(page.draft);
  perform public.cms_validate_template(page_slug, page.draft);
  update public.cms_pages set
    version = version + 1, updated_at = now(), status = 'en_revision',
    review_note = nullif(btrim(coalesce(note, '')), ''), submitted_by = auth.uid(),
    submitted_at = now(), reviewed_by = null, reviewed_at = null
  where slug = page_slug returning * into page;
  insert into public.cms_revisions(slug, content, version, action, created_by, actor_role, note)
  values (page_slug, page.draft, page.version, 'submit', auth.uid(), public.cms_role(), page.review_note);
  return to_jsonb(page);
end $$;

create or replace function public.cms_review(page_slug text, expected_version integer, decision text, note text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare page public.cms_pages;
begin
  if not public.is_cms_reviewer() then
    raise exception 'Reviewer permission required' using errcode = '42501';
  end if;
  if decision is null or decision not in ('aprobado', 'rechazado') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  if char_length(coalesce(note, '')) > 2000 then
    raise exception 'Invalid note' using errcode = '22023';
  end if;
  select * into page from public.cms_pages where slug = page_slug for update;
  if not found or expected_version is null or page.version <> expected_version then
    raise exception 'Editorial version conflict' using errcode = '40001';
  end if;
  if page.status <> 'en_revision' then
    raise exception 'Page is not under review' using errcode = '22023';
  end if;
  if page.submitted_by = auth.uid() and not public.is_community_admin() then
    raise exception 'No podés revisar tu propio envío' using errcode = '42501';
  end if;
  update public.cms_pages set
    version = version + 1, updated_at = now(), status = decision,
    review_note = nullif(btrim(coalesce(note, '')), ''), reviewed_by = auth.uid(), reviewed_at = now()
  where slug = page_slug returning * into page;
  insert into public.cms_revisions(slug, content, version, action, created_by, actor_role, note)
  values (page_slug, page.draft, page.version,
    case when decision = 'aprobado' then 'approve' else 'reject' end,
    auth.uid(), public.cms_role(), page.review_note);
  return to_jsonb(page);
end $$;

create or replace function public.cms_publish(page_slug text, expected_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare page public.cms_pages;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  select * into page from public.cms_pages where slug = page_slug for update;
  if not found or expected_version is null or page.version <> expected_version then
    raise exception 'Editorial version conflict' using errcode = '40001';
  end if;
  if page.status <> 'aprobado' then
    raise exception 'Publication requires institutional approval' using errcode = '22023';
  end if;
  perform public.cms_validate_document(page.draft);
  perform public.cms_validate_template(page_slug, page.draft);
  update public.cms_pages set
    version = version + 1, updated_at = now(), updated_by = auth.uid(), status = 'publicado'
  where slug = page_slug returning * into page;
  insert into public.cms_published(slug, content, version, published_at, published_by, approved_by, review_note)
  values (page_slug, page.draft, page.version, now(), auth.uid(), page.reviewed_by, page.review_note)
  on conflict (slug) do update set
    content = excluded.content, version = excluded.version, published_at = excluded.published_at,
    published_by = excluded.published_by, approved_by = excluded.approved_by,
    review_note = excluded.review_note;
  insert into public.cms_revisions(slug, content, version, action, created_by, actor_role, note)
  values (page_slug, page.draft, page.version, 'publish', auth.uid(), public.cms_role(),
    page.review_note);
  return to_jsonb(page);
end $$;

create or replace function public.cms_restore(page_slug text, revision_id bigint, expected_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare snapshot jsonb; page jsonb;
begin
  if not public.is_cms_editor() then
    raise exception 'Editor permission required' using errcode = '42501';
  end if;
  select content into snapshot from public.cms_revisions where id = revision_id and slug = page_slug;
  if not found then raise exception 'Revision not found' using errcode = 'P0002'; end if;
  page := public.cms_save_draft(page_slug, snapshot, expected_version);
  update public.cms_revisions set action = 'restore', note = 'Restauración como borrador'
  where id = (select max(id) from public.cms_revisions where slug = page_slug);
  return page;
end $$;

revoke all on function public.cms_save_draft(text, jsonb, integer),
  public.cms_submit_review(text, integer, text), public.cms_review(text, integer, text, text),
  public.cms_publish(text, integer), public.cms_restore(text, bigint, integer)
  from public, anon, authenticated;
grant execute on function public.cms_save_draft(text, jsonb, integer),
  public.cms_submit_review(text, integer, text), public.cms_review(text, integer, text, text),
  public.cms_publish(text, integer), public.cms_restore(text, bigint, integer)
  to authenticated;

commit;

-- ============================================================
-- 202611100009_busqueda_global.sql
-- ============================================================
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

-- ============================================================
-- 202611100010_metricas.sql
-- ============================================================
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

-- ============================================================
-- 202611100011_correo_cola.sql
-- ============================================================
begin;

-- Cola persistente de correo transaccional. El contenido se guarda como texto
-- plano; no se registran credenciales ni respuestas SMTP completas.
create table public.email_recipients (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  enabled boolean not null default true,
  token uuid not null unique default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
create table public.email_optouts (
  email text primary key check (char_length(email) between 3 and 254),
  reason text not null default 'baja' check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 300),
  kind text not null check (kind in ('contact_admin', 'contact_receipt')),
  recipient text not null check (char_length(recipient) between 3 and 254),
  related_contact uuid references public.contact_requests(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 10000),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_outbox_due on public.email_outbox(status, next_attempt_at, id);
create index email_outbox_created on public.email_outbox(created_at desc);
create table public.email_events (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references public.email_outbox(id) on delete cascade,
  action text not null check (action in ('queued', 'attempt', 'sent', 'retry', 'failed', 'cancelled')),
  detail text not null default '' check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);
create index email_events_outbox on public.email_events(outbox_id, id desc);

alter table public.email_recipients enable row level security;
alter table public.email_optouts enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_events enable row level security;
revoke all on public.email_recipients, public.email_optouts, public.email_outbox, public.email_events
  from public, anon, authenticated;
grant select on public.email_events to authenticated;
create policy email_events_admin on public.email_events for select to authenticated
  using ((select public.is_community_admin()));

create function public.contact_email_enqueue()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare recipient record; body_admin text; body_receipt text;
  site text := coalesce(nullif(current_setting('app.site_url', true), ''), 'https://eest3sf.netlify.app');
begin
  insert into public.email_recipients(user_id, email)
  select u.id, lower(u.email) from auth.users u
  join public.profiles p on p.id = u.id
  where p.role in ('administrador', 'revisor') and u.email is not null
  on conflict (user_id) do update set email = excluded.email, updated_at = now();

  for recipient in
    select r.user_id, r.email, r.token
    from public.email_recipients r
    join public.profiles p on p.id = r.user_id
    where p.role in ('administrador', 'revisor') and r.enabled
      and not exists (select 1 from public.email_optouts o where lower(o.email) = lower(r.email))
  loop
    body_admin := 'Nueva consulta recibida en el portal.' || chr(10) || chr(10)
      || 'Asunto: ' || new.subject || chr(10)
      || 'Nombre: ' || new.name || chr(10)
      || 'Correo: ' || new.email || chr(10)
      || 'Categoría: ' || new.category || chr(10)
      || 'Carrera: ' || coalesce(nullif(new.career, ''), 'Sin especificar') || chr(10) || chr(10)
      || 'Mensaje:' || chr(10) || new.message || chr(10) || chr(10)
      || 'Bandeja privada: ' || site || '/gestion.html' || chr(10)
      || 'Baja de avisos: ' || site || '/.netlify/functions/baja?token=' || recipient.token;
    insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body)
    values ('contact_admin:' || new.id::text || ':' || lower(recipient.email), 'contact_admin',
      recipient.email, new.id, 'Nueva consulta: ' || left(new.subject, 180), body_admin)
    on conflict (idempotency_key) do nothing;
    insert into public.email_events(outbox_id, action, detail)
      select o.id, 'queued', 'Aviso de recepción para el equipo'
      from public.email_outbox o
      where o.idempotency_key = 'contact_admin:' || new.id::text || ':' || lower(recipient.email)
        and not exists (select 1 from public.email_events e where e.outbox_id = o.id and e.action = 'queued');
  end loop;

  body_receipt := 'Recibimos tu consulta enviada al portal de la EEST N°3.' || chr(10) || chr(10)
    || 'Asunto: ' || new.subject || chr(10)
    || 'Este mensaje confirma la recepción; no confirma inscripciones, vacantes ni trámites.' || chr(10)
    || 'La institución podrá responder al correo indicado. No compartas datos sensibles por este canal.' || chr(10) || chr(10)
    || 'Privacidad: ' || site || '/privacidad.html';
  insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body)
  values ('contact_receipt:' || new.id::text, 'contact_receipt', lower(new.email), new.id,
    'Recibimos tu consulta', body_receipt)
  on conflict (idempotency_key) do nothing;
  insert into public.email_events(outbox_id, action, detail)
    select o.id, 'queued', 'Confirmación de recepción para la persona consultante'
    from public.email_outbox o
    where o.idempotency_key = 'contact_receipt:' || new.id::text
      and not exists (select 1 from public.email_events e where e.outbox_id = o.id and e.action = 'queued');
  return new;
exception when others then
  -- La consulta es la operación principal: un fallo de la cola de avisos no
  -- debe impedir que quede guardada para la bandeja institucional.
  return new;
end $$;
revoke all on function public.contact_email_enqueue() from public, anon, authenticated;
create trigger contact_email_enqueue after insert on public.contact_requests
  for each row execute function public.contact_email_enqueue();

create function public.email_claim(batch_size integer default 5)
returns setof public.email_outbox language plpgsql security definer set search_path = ''
as $$
declare item public.email_outbox; claimed public.email_outbox;
begin
  if batch_size is null or batch_size not between 1 and 20 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  -- Recupera mensajes cuyo procesador se interrumpió sin confirmar el envío.
  update public.email_outbox set status = 'pending', updated_at = now()
    where status = 'sending' and updated_at < now() - interval '10 minutes';
  for item in
    select * from public.email_outbox
    where status = 'pending' and next_attempt_at <= now() and attempts < max_attempts
    order by next_attempt_at, id
    limit batch_size
    for update skip locked
  loop
    update public.email_outbox set status = 'sending', attempts = attempts + 1, updated_at = now()
      where id = item.id returning * into claimed;
    insert into public.email_events(outbox_id, action, detail)
      values (claimed.id, 'attempt', 'Intento ' || claimed.attempts::text);
    return next claimed;
  end loop;
end $$;
revoke all on function public.email_claim(integer) from public, anon, authenticated;
grant execute on function public.email_claim(integer) to service_role;

create function public.email_mark_sent(item_id uuid, provider_id text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.email_outbox set status = 'sent', provider_message_id = left(provider_id, 300),
    last_error = null, updated_at = now()
  where id = item_id and status = 'sending';
  if not found then raise exception 'Message not claimed' using errcode = '40001'; end if;
  insert into public.email_events(outbox_id, action, detail)
    values (item_id, 'sent', 'Enviado por el proveedor');
end $$;
revoke all on function public.email_mark_sent(uuid, text) from public, anon, authenticated;
grant execute on function public.email_mark_sent(uuid, text) to service_role;

create function public.email_mark_failed(item_id uuid, error_detail text)
returns void language plpgsql security definer set search_path = ''
as $$
declare item public.email_outbox; next_status text; wait_minutes integer; action_name text;
begin
  select * into item from public.email_outbox where id = item_id and status = 'sending' for update;
  if not found then raise exception 'Message not claimed' using errcode = '40001'; end if;
  if item.attempts >= item.max_attempts then
    next_status := 'failed';
    action_name := 'failed';
    wait_minutes := 0;
  else
    next_status := 'pending';
    action_name := 'retry';
    wait_minutes := least(1440, 5 * (2 ^ least(item.attempts, 8))::integer);
  end if;
  update public.email_outbox set status = next_status,
    last_error = left(coalesce(error_detail, 'Error desconocido'), 1000),
    next_attempt_at = case when next_status = 'pending' then now() + make_interval(mins => wait_minutes) else next_attempt_at end,
    updated_at = now()
  where id = item_id;
  insert into public.email_events(outbox_id, action, detail)
    values (item_id, action_name, left(coalesce(error_detail, 'Error desconocido'), 1000));
end $$;
revoke all on function public.email_mark_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.email_mark_failed(uuid, text) to service_role;

create function public.email_retry(item_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  update public.email_outbox set status = 'pending', attempts = 0, last_error = null,
    next_attempt_at = now(), updated_at = now()
  where id = item_id and status in ('failed', 'cancelled');
  if not found then raise exception 'Message cannot be retried' using errcode = '22023'; end if;
  insert into public.email_events(outbox_id, action, detail)
    values (item_id, 'retry', 'Reintento manual de administración');
end $$;
revoke all on function public.email_retry(uuid) from public, anon;
grant execute on function public.email_retry(uuid) to authenticated;

create function public.email_optout(unsubscribe_token uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.email_recipients; cancelled public.email_outbox;
begin
  if unsubscribe_token is null then raise exception 'Invalid unsubscribe token' using errcode = '22023'; end if;
  select * into target from public.email_recipients where token = unsubscribe_token for update;
  if not found then raise exception 'Invalid unsubscribe token' using errcode = '22023'; end if;
  update public.email_recipients set enabled = false, updated_at = now() where user_id = target.user_id;
  insert into public.email_optouts(email, reason) values (lower(target.email), 'baja voluntaria')
    on conflict (email) do update set reason = excluded.reason, created_at = now();
  for cancelled in
    update public.email_outbox set status = 'cancelled', updated_at = now()
    where lower(recipient) = lower(target.email) and status in ('pending', 'failed')
    returning *
  loop
    insert into public.email_events(outbox_id, action, detail)
      values (cancelled.id, 'cancelled', 'Baja voluntaria del destinatario');
  end loop;
end $$;
revoke all on function public.email_optout(uuid) from public;
grant execute on function public.email_optout(uuid) to anon, authenticated, service_role;

create function public.email_admin_summary()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'pending', count(*) filter (where status = 'pending'),
    'sending', count(*) filter (where status = 'sending'),
    'sent', count(*) filter (where status = 'sent'),
    'failed', count(*) filter (where status = 'failed'),
    'cancelled', count(*) filter (where status = 'cancelled'),
    'recipients', (select count(*) from public.email_recipients where enabled),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'recipient', recipient, 'status', status,
        'attempts', attempts, 'last_error', last_error,
        'created_at', created_at, 'next_attempt_at', next_attempt_at
      ) order by created_at desc)
      from (select * from public.email_outbox order by created_at desc limit 20) recent
    ), '[]'::jsonb)
  ) into result
  from public.email_outbox;
  return result;
end $$;
revoke all on function public.email_admin_summary() from public, anon;
grant execute on function public.email_admin_summary() to authenticated;

comment on table public.email_outbox is
  'Cola persistente de correo transaccional con reintentos exponenciales y trazabilidad.';

commit;

