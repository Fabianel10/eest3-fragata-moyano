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
