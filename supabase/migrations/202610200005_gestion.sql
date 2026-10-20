begin;

create table public.contact_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 10 and 5000),
  category text not null check (category in ('general','inscripciones','carreras','documentacion')),
  career text not null check (career in ('','informatica','madera','obras')),
  privacy_version text not null check (privacy_version = '2026-10-20'),
  status text not null default 'nueva' check (status in ('nueva','revision','respondida','cerrada')),
  assigned_to uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create index contact_requests_queue on public.contact_requests(status, created_at desc, id);

create table public.contact_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) <= 2000)
);
create table public.contact_rate_limits (
  source_hash text primary key,
  window_start timestamptz not null,
  count integer not null
);
create index contact_history_request on public.contact_history(request_id, id desc);
create index contact_rate_limits_expiry on public.contact_rate_limits(window_start);

alter table public.contact_requests enable row level security;
alter table public.contact_history enable row level security;
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_requests, public.contact_history, public.contact_rate_limits from public, anon, authenticated;
grant select on public.contact_requests, public.contact_history to authenticated;
create policy contact_admin_read on public.contact_requests for select to authenticated
  using ((select public.is_community_admin()));
create policy contact_history_admin_read on public.contact_history for select to authenticated
  using ((select public.is_community_admin()));

create function public.contact_submit(request_id uuid, payload jsonb, source_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing public.contact_requests;
  bucket public.contact_rate_limits;
begin
  if request_id is null or source_hash is null or source_hash !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(payload) is distinct from 'object'
     or payload->>'privacidad' is distinct from 'aceptada' then
    raise exception 'Invalid contact input' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(source_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended(request_id::text, 1));
  select * into existing from public.contact_requests where id = request_id;
  if found then
    if existing.name is distinct from payload->>'nombre'
       or existing.email is distinct from payload->>'correo'
       or existing.subject is distinct from payload->>'asunto'
       or existing.message is distinct from payload->>'mensaje'
       or existing.category is distinct from payload->>'categoria'
       or existing.career is distinct from payload->>'carrera' then
      raise exception 'Idempotency conflict' using errcode = '23505';
    end if;
    return existing.id;
  end if;
  delete from public.contact_rate_limits where window_start < now() - interval '1 day';
  insert into public.contact_rate_limits values (source_hash, now(), 0)
    on conflict on constraint contact_rate_limits_pkey do nothing;
  select * into bucket from public.contact_rate_limits where contact_rate_limits.source_hash = contact_submit.source_hash for update;
  if bucket.window_start <= now() - interval '1 hour' then
    update public.contact_rate_limits set count = 0, window_start = now()
      where contact_rate_limits.source_hash = contact_submit.source_hash;
  elsif bucket.count >= 5 then
    raise exception 'Contact rate limit' using errcode = 'P0001';
  end if;
  insert into public.contact_requests(id,name,email,subject,message,category,career,privacy_version)
    values(request_id,payload->>'nombre',payload->>'correo',payload->>'asunto',
      payload->>'mensaje',payload->>'categoria',payload->>'carrera','2026-10-20');
  update public.contact_rate_limits set count = count + 1
    where contact_rate_limits.source_hash = contact_submit.source_hash;
  return request_id;
end $$;
revoke all on function public.contact_submit(uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.contact_submit(uuid,jsonb,text) to service_role;

create function public.contact_manage(request_id uuid, expected_version integer, next_status text,
  assignee uuid, internal_note text)
returns public.contact_requests language plpgsql security definer set search_path = '' as $$
declare saved public.contact_requests;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if assignee is not null and not exists(select 1 from public.profiles where id = assignee and role = 'administrador') then
    raise exception 'Invalid assignee' using errcode = '22023';
  end if;
  update public.contact_requests set status = next_status, assigned_to = assignee,
    updated_at = now(), version = version + 1
    where id = request_id and version = expected_version returning * into saved;
  if not found then raise exception 'Concurrent update or missing request' using errcode = '40001'; end if;
  insert into public.contact_history(request_id,actor,status,assigned_to,note)
    values(request_id,auth.uid(),next_status,assignee,btrim(internal_note));
  return saved;
end $$;
revoke all on function public.contact_manage(uuid,integer,text,uuid,text) from public, anon;
grant execute on function public.contact_manage(uuid,integer,text,uuid,text) to authenticated;

create function public.contact_delete(request_id uuid, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_community_admin() then raise exception 'Administrator permission required' using errcode = '42501'; end if;
  delete from public.contact_requests where id = request_id and version = expected_version;
  if not found then raise exception 'Concurrent update or missing request' using errcode = '40001'; end if;
end $$;
revoke all on function public.contact_delete(uuid,integer) from public, anon;
grant execute on function public.contact_delete(uuid,integer) to authenticated;

create table public.institutional_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('comunicado','documento','proyecto','horario')),
  title text not null check (char_length(btrim(title)) between 3 and 200),
  body text not null check (char_length(btrim(body)) between 10 and 20000),
  career text not null default '' check (career in ('','informatica','madera','obras')),
  audience text not null default 'comunidad' check (audience in ('comunidad','alumnos','familias','docentes')),
  attachment_url text not null default '' check (
    attachment_url = '' or (char_length(attachment_url) <= 2048
      and attachment_url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#][^[:space:]<>]*)?$'
      and attachment_url !~ '[[:cntrl:]]')),
  attachment_label text not null default '' check (char_length(attachment_label) <= 200),
  published_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  check (expires_at is null or published_at is null or expires_at > published_at),
  check (attachment_url = '' or char_length(btrim(attachment_label)) > 0)
);
create index institutional_posts_feed on public.institutional_posts(published_at desc, id);
alter table public.institutional_posts enable row level security;
revoke all on public.institutional_posts from public, anon, authenticated;
grant select (id,kind,title,body,career,audience,attachment_url,attachment_label,
  published_at,expires_at,updated_at,version) on public.institutional_posts to anon, authenticated;
create policy posts_public_read on public.institutional_posts for select to anon, authenticated
  using (published_at <= now() and (expires_at is null or expires_at > now()));
create policy posts_admin_read on public.institutional_posts for select to authenticated
  using ((select public.is_community_admin()));

create table public.institutional_post_history (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.institutional_posts(id),
  created_at timestamptz not null default now(),
  actor uuid references auth.users(id) on delete set null,
  document jsonb not null
);
create index institutional_post_history_page on public.institutional_post_history(post_id, id desc);
alter table public.institutional_post_history enable row level security;
revoke all on public.institutional_post_history from public, anon, authenticated;
grant select on public.institutional_post_history to authenticated;
create policy post_history_admin on public.institutional_post_history for select to authenticated
  using ((select public.is_community_admin()));
create function public.institutional_post_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.institutional_post_history(post_id,actor,document)
    values(new.id,auth.uid(),to_jsonb(new));
  return new;
end $$;
revoke all on function public.institutional_post_audit() from public, anon, authenticated;
create trigger institutional_post_audit after insert or update on public.institutional_posts
  for each row execute function public.institutional_post_audit();

create function public.institutional_post_save(post_id uuid, expected_version integer, document jsonb)
returns public.institutional_posts language plpgsql security definer set search_path = '' as $$
declare saved public.institutional_posts;
begin
  if not public.is_community_admin() then raise exception 'Administrator permission required' using errcode = '42501'; end if;
  if expected_version = 0 then
    if exists(select 1 from public.institutional_posts where id=post_id) then
      raise exception 'Concurrent update or missing post' using errcode = '40001';
    end if;
    insert into public.institutional_posts(id,kind,title,body,career,audience,attachment_url,
      attachment_label,published_at,expires_at,updated_by)
    values(post_id,document->>'kind',btrim(document->>'title'),btrim(document->>'body'),
      document->>'career',document->>'audience',document->>'attachment_url',document->>'attachment_label',
      (document->>'published_at')::timestamptz,(document->>'expires_at')::timestamptz,auth.uid())
      returning * into saved;
  else
    update public.institutional_posts set
      kind=document->>'kind',title=btrim(document->>'title'),body=btrim(document->>'body'),
      career=document->>'career',audience=document->>'audience',attachment_url=document->>'attachment_url',
      attachment_label=document->>'attachment_label',published_at=(document->>'published_at')::timestamptz,
      expires_at=(document->>'expires_at')::timestamptz,updated_by=auth.uid(),updated_at=now(),version=version+1
      where id=post_id and version=expected_version returning * into saved;
    if not found then raise exception 'Concurrent update or missing post' using errcode = '40001'; end if;
  end if;
  return saved;
end $$;
revoke all on function public.institutional_post_save(uuid,integer,jsonb) from public, anon;
grant execute on function public.institutional_post_save(uuid,integer,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('institutional-documents','institutional-documents',true,10485760,array['application/pdf']);
create policy documents_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'institutional-documents');
create policy documents_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'institutional-documents' and (select public.is_community_admin())
    and name ~ '^[a-f0-9-]{36}\.pdf$');

commit;
