begin;

-- Recuperación de 2FA con códigos de un solo uso.
create table public.mfa_recovery_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);
create index mfa_recovery_codes_user on public.mfa_recovery_codes(user_id, used_at);
alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from public, anon, authenticated;

create function public.mfa_recovery_generate()
returns text[] language plpgsql security definer set search_path = ''
as $$
declare codes text[] := '{}'; i integer; code text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid() and factor_type = 'totp' and status = 'verified'
  ) then
    raise exception 'Configurá 2FA antes de generar códigos' using errcode = '22023';
  end if;
  delete from public.mfa_recovery_codes where user_id = auth.uid();
  for i in 1..8 loop
    code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
    insert into public.mfa_recovery_codes(user_id, code_hash)
    values (auth.uid(), md5(code || ':' || auth.uid()::text));
    codes := array_append(codes, code);
  end loop;
  return codes;
end $$;
revoke all on function public.mfa_recovery_generate() from public, anon;
grant execute on function public.mfa_recovery_generate() to authenticated;

create function public.mfa_recovery_use(p_code text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare target public.mfa_recovery_codes;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_code is null or char_length(btrim(p_code)) < 16 then
    raise exception 'Código de recuperación inválido' using errcode = '22023';
  end if;
  select * into target from public.mfa_recovery_codes
    where user_id = auth.uid() and code_hash = md5(btrim(p_code) || ':' || auth.uid()::text)
      and used_at is null
    for update;
  if not found then raise exception 'Código de recuperación inválido o ya usado' using errcode = '22023'; end if;
  update public.mfa_recovery_codes set used_at = now() where id = target.id;
  delete from auth.mfa_factors where user_id = auth.uid();
  update public.profiles set mfa_required = false, updated_at = now() where id = auth.uid();
  return true;
end $$;
revoke all on function public.mfa_recovery_use(text) from public, anon;
grant execute on function public.mfa_recovery_use(text) to authenticated;

-- Plantillas de respuesta institucional.
create table public.contact_reply_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 10 and 10000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contact_reply_templates enable row level security;
revoke all on public.contact_reply_templates from public, anon, authenticated;
grant select, insert, update, delete on public.contact_reply_templates to authenticated;
create policy contact_templates_admin on public.contact_reply_templates for all to authenticated
  using ((select public.is_community_admin())) with check ((select public.is_community_admin()));

alter table public.contact_messages
  add column attachment_url text not null default '' check (
    attachment_url = '' or (char_length(attachment_url) <= 2048
      and attachment_url ~ '^https://[^[:space:]<>]+$')),
  add column attachment_label text not null default '' check (char_length(attachment_label) <= 200),
  add constraint contact_messages_attachment_label check (attachment_url = '' or char_length(btrim(attachment_label)) > 0);

-- Reemplaza contact_reply por la versión con adjunto opcional.
drop function if exists public.contact_reply(uuid, integer, text, text, uuid);
create function public.contact_reply(p_request_id uuid, p_expected_version integer, p_subject text,
  p_body text, p_request_key uuid, p_attachment_url text default '', p_attachment_label text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare request public.contact_requests; saved public.contact_messages; existing public.contact_messages;
  html text; texto text; adjunto text := coalesce(btrim(p_attachment_url), '');
  etiqueta text := coalesce(btrim(p_attachment_label), '');
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_request_key is null or p_subject is null or char_length(btrim(p_subject)) not between 1 and 200
    or p_body is null or char_length(btrim(p_body)) not between 10 and 10000 then
    raise exception 'Invalid reply' using errcode = '22023';
  end if;
  if adjunto <> '' and (adjunto !~ '^https://[^[:space:]<>]+$' or char_length(adjunto) > 2048
    or etiqueta = '' or char_length(etiqueta) > 200) then
    raise exception 'Invalid attachment' using errcode = '22023';
  end if;
  select * into request from public.contact_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  select * into existing from public.contact_messages where request_key = p_request_key;
  if found then
    if existing.request_id <> p_request_id then
      raise exception 'Reply identifier belongs to another request' using errcode = '23505';
    end if;
    return jsonb_build_object('request', to_jsonb(request), 'message', to_jsonb(existing), 'duplicate', true);
  end if;
  if request.version <> p_expected_version then
    raise exception 'Concurrent update or missing request' using errcode = '40001';
  end if;
  insert into public.contact_messages(request_id, direction, actor, request_key, subject, body,
    attachment_url, attachment_label)
  values (p_request_id, 'outbound', auth.uid(), p_request_key, btrim(p_subject), btrim(p_body),
    adjunto, etiqueta)
  returning * into saved;
  update public.contact_requests set status = 'respondida', version = version + 1, updated_at = now()
    where id = p_request_id returning * into request;
  insert into public.contact_history(request_id, actor, status, assigned_to, note)
  values (p_request_id, auth.uid(), 'respondida', request.assigned_to, 'Respuesta enviada por correo');
  texto := btrim(p_body) || case when adjunto <> '' then chr(10) || chr(10) || 'Adjunto: ' || etiqueta || chr(10) || adjunto else '' end;
  html := public.email_html('Respuesta a tu consulta',
    btrim(p_body) || case when adjunto <> '' then chr(10) || chr(10) || 'Adjunto: ' || etiqueta || chr(10) || adjunto else '' end);
  insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body, html_body)
  values ('contact_reply:' || p_request_key::text, 'contact_reply', lower(request.email), p_request_id,
    btrim(p_subject), texto, html)
  on conflict (idempotency_key) do nothing;
  insert into public.email_events(outbox_id, action, detail)
    select o.id, 'queued', 'Respuesta institucional a la consulta'
    from public.email_outbox o where o.idempotency_key = 'contact_reply:' || p_request_key::text
      and not exists (select 1 from public.email_events e where e.outbox_id = o.id and e.action = 'queued');
  return jsonb_build_object('request', to_jsonb(request), 'message', to_jsonb(saved), 'duplicate', false);
end $$;
revoke all on function public.contact_reply(uuid, integer, text, text, uuid, text, text) from public, anon;
grant execute on function public.contact_reply(uuid, integer, text, text, uuid, text, text) to authenticated;

drop function if exists public.contact_thread(uuid);
create function public.contact_thread(target_request uuid)
returns table(id text, direction text, actor uuid, body text, created_at timestamptz,
  attachment_url text, attachment_label text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  return query
    with hilo as (
      select 'request:' || r.id::text as id, 'inbound'::text as direction, null::uuid as actor,
        r.message as body, r.created_at as created_at, 0 as orden, ''::text as attachment_url,
        ''::text as attachment_label
      from public.contact_requests r where r.id = target_request
      union all
      select 'message:' || m.id::text, m.direction, m.actor, m.body, m.created_at, 1,
        m.attachment_url, m.attachment_label
      from public.contact_messages m where m.request_id = target_request
    )
    select hilo.id, hilo.direction, hilo.actor, hilo.body, hilo.created_at,
      hilo.attachment_url, hilo.attachment_label
    from hilo order by hilo.created_at, hilo.orden, hilo.id;
end $$;
revoke all on function public.contact_thread(uuid) from public, anon;
grant execute on function public.contact_thread(uuid) to authenticated;

-- Estado operativo agregado para el equipo.
create or replace function public.system_health()
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_cms_team() then
    raise exception 'Editorial team permission required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'checked_at', now(),
    'queue_pending', (select count(*) from public.email_outbox where status = 'pending'),
    'queue_sending', (select count(*) from public.email_outbox where status = 'sending'),
    'queue_failed', (select count(*) from public.email_outbox where status in ('failed', 'bounced', 'complained')),
    'oldest_pending_minutes', coalesce((select round(extract(epoch from now() - min(created_at)) / 60)::int
      from public.email_outbox where status in ('pending', 'sending')), 0),
    'contacts_new', (select count(*) from public.contact_requests where status = 'nueva'),
    'contacts_total', (select count(*) from public.contact_requests),
    'posts_published', (select count(*) from public.institutional_posts
      where published_at <= now() and (expires_at is null or expires_at > now())),
    'calendar_published', (select count(*) from public.calendar_events where published),
    'metrics_today', coalesce((select sum(count)::int from public.metrics_daily where day = current_date), 0),
    'admins_without_mfa', (select count(*) from public.profiles
      where role = 'administrador' and not mfa_required)
  );
end $$;
revoke all on function public.system_health() from public, anon;
grant execute on function public.system_health() to authenticated;

commit;
