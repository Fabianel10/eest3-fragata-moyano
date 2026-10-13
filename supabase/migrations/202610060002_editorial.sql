begin;

create function public.cms_safe_url(value text, kind text)
returns boolean language sql immutable set search_path = ''
as $$
  select value is not null and char_length(value) <= 2048
    and value !~ '[[:space:]\\<>"''`]'
    and (
      (value = '' and kind <> 'link')
      or value ~ '^https://[^/@:?#]+(:443)?([/?#][^[:space:]]*)?$'
      or (kind = 'link' and value ~ '^(#[a-zA-Z0-9_-]+|mailto:[^:]+@[^:]+|tel:\+?[0-9-]+)$')
      or (value ~ '^(assets/[a-zA-Z0-9_%./()-]+|[a-zA-Z0-9_-]+\.html(#[a-zA-Z0-9_-]+)?)$'
        and value !~ '(^|/)\.\.(/|$)' and value !~* '%(2e|2f|5c)')
    );
$$;

create function public.cms_validate_fields(fields jsonb)
returns void language plpgsql set search_path = ''
as $$
declare field record; kind text;
begin
  if jsonb_typeof(fields) is distinct from 'object' then
    raise exception 'Invalid fields' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(fields)) > 1000 then
    raise exception 'Too many fields' using errcode = '22023';
  end if;
  for field in select * from jsonb_each(fields) loop
    kind := field.value ->> 'kind';
    if field.key !~ '^[a-zA-Z0-9_-]{1,80}$'
      or jsonb_typeof(field.value) is distinct from 'object'
      or kind is null or kind not in ('text', 'image', 'background', 'link')
      or jsonb_typeof(field.value -> 'value') is distinct from 'string'
      or char_length(field.value ->> 'value') > 10000 then
      raise exception 'Invalid field' using errcode = '22023';
    end if;
    if kind <> 'text' and not public.cms_safe_url(field.value ->> 'value', kind) then
      raise exception 'Invalid URL' using errcode = '22023';
    end if;
    if kind = 'image' and (jsonb_typeof(field.value -> 'alt') is distinct from 'string'
      or char_length(field.value ->> 'alt') > 500) then
      raise exception 'Invalid image description' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create function public.cms_validate_custom_fields(fields jsonb)
returns void language plpgsql set search_path = ''
as $$
declare field record;
begin
  for field in select * from jsonb_each(fields) loop
    if field.key not in ('kicker', 'title', 'body', 'image', 'link', 'linkText')
      or field.value ->> 'kind' is distinct from
        (case field.key when 'image' then 'image' when 'link' then 'link' else 'text' end) then
      raise exception 'Invalid custom field type' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create function public.cms_validate_document(document jsonb)
returns void language plpgsql set search_path = ''
as $$
declare block jsonb; card jsonb; item jsonb;
  ids text[] := '{}'; sources text[] := '{}'; dates text[] := '{}'; date_value date;
begin
  if document is null or octet_length(document::text) > 1048576
    or document -> 'version' is distinct from '1'::jsonb
    or jsonb_typeof(document -> 'title') is distinct from 'string'
    or char_length(btrim(document ->> 'title')) not between 1 and 200
    or jsonb_typeof(document -> 'description') is distinct from 'string'
    or char_length(document ->> 'description') > 500
    or jsonb_typeof(document -> 'blocks') is distinct from 'array'
    or jsonb_typeof(document -> 'modules') is distinct from 'object' then
    raise exception 'Invalid editorial document' using errcode = '22023';
  end if;
  if jsonb_array_length(document -> 'blocks') not between 1 and 60 then
    raise exception 'Invalid block count' using errcode = '22023';
  end if;
  perform public.cms_validate_fields(document -> 'chrome');
  for block in select value from jsonb_array_elements(document -> 'blocks') loop
    if jsonb_typeof(block) is distinct from 'object'
      or coalesce(block ->> 'id', '') !~ '^[a-zA-Z0-9_-]{1,80}$'
      or (block ->> 'id') = any(ids)
      or coalesce(block ->> 'kind', '') not in ('original', 'texto', 'imagen', 'llamada', 'tarjetas')
      or jsonb_typeof(block -> 'hidden') is distinct from 'boolean'
      or coalesce(block ->> 'theme', '') not in ('claro', 'acento', 'oscuro')
      or coalesce(block ->> 'layout', '') not in ('izquierda', 'derecha')
      or jsonb_typeof(block -> 'label') is distinct from 'string'
      or char_length(block ->> 'label') > 120
      or jsonb_typeof(block -> 'cards') is distinct from 'array' then
      raise exception 'Invalid block' using errcode = '22023';
    end if;
    ids := array_append(ids, block ->> 'id');
    if block ->> 'kind' = 'original' then
      if coalesce(block ->> 'source', '') !~ '^b[0-9]+$' or (block ->> 'source') = any(sources) then
        raise exception 'Invalid original block' using errcode = '22023';
      end if;
      sources := array_append(sources, block ->> 'source');
    end if;
    perform public.cms_validate_fields(block -> 'fields');
    if block ->> 'kind' <> 'original' then
      perform public.cms_validate_custom_fields(block -> 'fields');
    end if;
    if jsonb_array_length(block -> 'cards') > 12 then
      raise exception 'Too many cards' using errcode = '22023';
    end if;
    for card in select value from jsonb_array_elements(block -> 'cards') loop
      perform public.cms_validate_fields(card);
      perform public.cms_validate_custom_fields(card);
    end loop;
  end loop;
  if jsonb_typeof(document #> '{modules,gallery}') is distinct from 'array'
    or jsonb_typeof(document #> '{modules,events}') is distinct from 'array'
    or jsonb_typeof(document #> '{modules,playlist}') is distinct from 'array'
    or coalesce(document #>> '{modules,year}', '') !~ '^[0-9]{4}$' then
    raise exception 'Invalid modules' using errcode = '22023';
  end if;
  if (document #>> '{modules,year}')::int not between 2000 and 2100
    or jsonb_array_length(document #> '{modules,gallery}') > 100
    or jsonb_array_length(document #> '{modules,events}') > 500
    or jsonb_array_length(document #> '{modules,playlist}') > 30 then
    raise exception 'Invalid module limits' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(document #> '{modules,gallery}') loop
    if coalesce(item ->> 'type', '') not in ('image', 'video')
      or not public.cms_safe_url(item ->> 'src', 'image') or coalesce(item ->> 'src', '') = ''
      or jsonb_typeof(item -> 'title') is distinct from 'string'
      or char_length(btrim(item ->> 'title')) not between 1 and 300 then
      raise exception 'Invalid gallery item' using errcode = '22023';
    end if;
  end loop;
  for item in select value from jsonb_array_elements(document #> '{modules,events}') loop
    if coalesce(item ->> 'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Invalid event date' using errcode = '22023';
    end if;
    date_value := (item ->> 'date')::date;
    if extract(year from date_value) not between 2000 and 2100 or (item ->> 'date') = any(dates)
      or coalesce(item ->> 'type', '') not in ('feriado', 'local', 'docente', 'turistico', 'efemeride', 'tecnica')
      or jsonb_typeof(item -> 'title') is distinct from 'string'
      or char_length(btrim(item ->> 'title')) not between 1 and 300
      or jsonb_typeof(item -> 'description') is distinct from 'string'
      or char_length(item ->> 'description') > 2000
      or not public.cms_safe_url(item ->> 'image', 'image') then
      raise exception 'Invalid event' using errcode = '22023';
    end if;
    dates := array_append(dates, item ->> 'date');
  end loop;
  for item in select value from jsonb_array_elements(document #> '{modules,playlist}') loop
    if not public.cms_safe_url(item ->> 'src', 'image') or coalesce(item ->> 'src', '') = ''
      or jsonb_typeof(item -> 'title') is distinct from 'string'
      or char_length(btrim(item ->> 'title')) not between 1 and 300 then
      raise exception 'Invalid audio' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create table public.cms_pages (
  slug text primary key check (slug in ('inicio', 'historia', 'galeria', 'calendario')),
  draft jsonb not null,
  version integer not null check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table public.cms_published (
  slug text primary key references public.cms_pages(slug),
  content jsonb not null,
  version integer not null,
  published_at timestamptz not null default now()
);
create table public.cms_revisions (
  id bigint generated always as identity primary key,
  slug text not null references public.cms_pages(slug),
  content jsonb not null,
  version integer not null,
  action text not null check (action in ('save', 'publish', 'restore')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index cms_revisions_page_history on public.cms_revisions (slug, id desc);

create table public.cms_templates (
  slug text primary key,
  manifest jsonb not null
);
alter table public.cms_templates enable row level security;
revoke all on public.cms_templates from anon, authenticated;

create function public.cms_validate_template(page_slug text, document jsonb)
returns void language plpgsql set search_path = ''
as $$
declare manifest jsonb; block jsonb; field record; fields_manifest jsonb;
begin
  select t.manifest into manifest from public.cms_templates t where t.slug = page_slug;
  if not found then raise exception 'Missing template migration' using errcode = '22023'; end if;
  for field in select * from jsonb_each(document -> 'chrome') loop
    if manifest #>> array['chrome', field.key] is distinct from field.value ->> 'kind' then
      raise exception 'Unknown chrome field' using errcode = '22023';
    end if;
  end loop;
  for block in select value from jsonb_array_elements(document -> 'blocks') loop
    if block ->> 'kind' <> 'original' then continue; end if;
    fields_manifest := manifest #> array['blocks', block ->> 'source'];
    if fields_manifest is null then raise exception 'Unknown original template' using errcode = '22023'; end if;
    for field in select * from jsonb_each(block -> 'fields') loop
      if fields_manifest ->> field.key is distinct from field.value ->> 'kind' then
        raise exception 'Unknown original field' using errcode = '22023';
      end if;
    end loop;
  end loop;
end;
$$;

alter table public.cms_pages enable row level security;
alter table public.cms_published enable row level security;
alter table public.cms_revisions enable row level security;
create policy cms_drafts_admin on public.cms_pages for select to authenticated
using ((select public.is_community_admin()));
create policy cms_history_admin on public.cms_revisions for select to authenticated
using ((select public.is_community_admin()));
create policy cms_published_read on public.cms_published for select to anon, authenticated using (true);
revoke all on public.cms_pages, public.cms_published, public.cms_revisions from anon, authenticated;
grant select on public.cms_pages, public.cms_revisions to authenticated;
grant select on public.cms_published to anon, authenticated;

create function public.cms_save_draft(page_slug text, document jsonb, expected_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare page public.cms_pages;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if page_slug not in ('inicio', 'historia', 'galeria', 'calendario') or page_slug is null
    or expected_version is null or expected_version < 0 then
    raise exception 'Invalid page or version' using errcode = '22023';
  end if;
  perform public.cms_validate_document(document);
  perform public.cms_validate_template(page_slug, document);
  if expected_version = 0 then
    insert into public.cms_pages(slug, draft, version, updated_by)
    values (page_slug, document, 1, auth.uid()) on conflict do nothing;
    if found then
      insert into public.cms_revisions(slug, content, version, action, created_by)
      values (page_slug, document, 1, 'save', auth.uid());
      select * into page from public.cms_pages where slug = page_slug;
      return to_jsonb(page);
    end if;
  end if;
  select * into page from public.cms_pages where slug = page_slug for update;
  if not found or page.version <> expected_version then
    raise exception 'Editorial version conflict' using errcode = '40001';
  end if;
  update public.cms_pages set draft = document, version = version + 1, updated_at = now(), updated_by = auth.uid()
  where slug = page_slug returning * into page;
  insert into public.cms_revisions(slug, content, version, action, created_by)
  values (page_slug, document, page.version, 'save', auth.uid());
  return to_jsonb(page);
end;
$$;

create function public.cms_publish(page_slug text, expected_version integer)
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
  perform public.cms_validate_document(page.draft);
  perform public.cms_validate_template(page_slug, page.draft);
  update public.cms_pages set version = version + 1, updated_at = now(), updated_by = auth.uid()
  where slug = page_slug returning * into page;
  insert into public.cms_published(slug, content, version, published_at)
  values (page_slug, page.draft, page.version, now())
  on conflict (slug) do update
    set content = excluded.content, version = excluded.version, published_at = excluded.published_at;
  insert into public.cms_revisions(slug, content, version, action, created_by)
  values (page_slug, page.draft, page.version, 'publish', auth.uid());
  return to_jsonb(page);
end;
$$;

create function public.cms_restore(page_slug text, revision_id bigint, expected_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare snapshot jsonb; page jsonb;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  select content into snapshot from public.cms_revisions where id = revision_id and slug = page_slug;
  if not found then raise exception 'Revision not found' using errcode = 'P0002'; end if;
  page := public.cms_save_draft(page_slug, snapshot, expected_version);
  update public.cms_revisions set action = 'restore'
  where id = (select max(id) from public.cms_revisions where slug = page_slug);
  return page;
end;
$$;

revoke all on function public.cms_safe_url(text, text),
  public.cms_validate_fields(jsonb), public.cms_validate_document(jsonb),
  public.cms_validate_custom_fields(jsonb),
  public.cms_validate_template(text, jsonb),
  public.cms_save_draft(text, jsonb, integer), public.cms_publish(text, integer),
  public.cms_restore(text, bigint, integer) from public, anon, authenticated;
grant execute on function public.cms_save_draft(text, jsonb, integer),
  public.cms_publish(text, integer), public.cms_restore(text, bigint, integer) to authenticated;

create table public.cms_media (
  id uuid primary key,
  path text unique not null check (path ~ '^[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|mp3)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg')),
  size_bytes integer not null check (size_bytes between 1 and 20971520),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  alt text not null default '' check (char_length(alt) <= 500),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);
alter table public.cms_media enable row level security;
create policy cms_media_read on public.cms_media for select to authenticated using ((select public.is_community_admin()));
create policy cms_media_insert on public.cms_media for insert to authenticated
with check ((select public.is_community_admin()) and created_by = (select auth.uid()));
create policy cms_media_update on public.cms_media for update to authenticated
using ((select public.is_community_admin())) with check ((select public.is_community_admin()));
revoke all on public.cms_media from anon, authenticated;
grant select, insert on public.cms_media to authenticated;
grant update(title, alt, archived) on public.cms_media to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('institutional-media', 'institutional-media', true, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg']);
create policy cms_storage_public on storage.objects for select to anon, authenticated
using (bucket_id = 'institutional-media');
create policy cms_storage_upload on storage.objects for insert to authenticated
with check (bucket_id = 'institutional-media' and (select public.is_community_admin())
  and name ~ '^[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|mp3)$');

commit;
