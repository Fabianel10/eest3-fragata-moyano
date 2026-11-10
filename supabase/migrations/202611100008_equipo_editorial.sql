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
