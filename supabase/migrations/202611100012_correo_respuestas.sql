begin;

-- Correo avanzado: HTML, reply-to, rebotes y alertas de fallo.
alter table public.email_outbox add column html_body text check (html_body is null or char_length(html_body) <= 60000);
alter table public.email_outbox add column reply_to text check (reply_to is null or (char_length(reply_to) between 3 and 254
  and reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('contact_admin', 'contact_receipt', 'contact_reply', 'admin_alert'));
alter table public.email_outbox drop constraint if exists email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled', 'bounced', 'complained'));
alter table public.email_events drop constraint if exists email_events_action_check;
alter table public.email_events add constraint email_events_action_check
  check (action in ('queued', 'attempt', 'sent', 'retry', 'failed', 'cancelled', 'delivered', 'bounce', 'complaint', 'alert'));

create or replace function public.email_html_escape(value text)
returns text language sql immutable set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(value, ''), '&', '&amp;'), '<', '&lt;'),
    '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function public.email_html(title text, body text)
returns text language sql immutable set search_path = ''
as $$
  select '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' ||
    '<body style="margin:0;padding:24px;background:#f4f7f9;font-family:Arial,sans-serif;color:#071a2b">' ||
    '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #d8e2ea">' ||
    '<p style="margin:0 0 6px;color:#087fa5;font-size:13px;font-weight:bold;letter-spacing:.04em">EEST N°3 · FRAGATA MOYANO</p>' ||
    '<h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">' || public.email_html_escape(title) || '</h1>' ||
    '<div style="white-space:pre-wrap;font-size:15px;line-height:1.6">' || public.email_html_escape(body) || '</div>' ||
    '<hr style="border:0;border-top:1px solid #d8e2ea;margin:24px 0">' ||
    '<p style="font-size:12px;color:#5d6b78;margin:0">Mensaje automático del portal institucional. No respondas a esta dirección si no corresponde.</p>' ||
    '</div></body></html>';
$$;
revoke all on function public.email_html_escape(text), public.email_html(text, text) from public, anon, authenticated;

create or replace function public.contact_email_enqueue()
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
    insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body, html_body, reply_to)
    values ('contact_admin:' || new.id::text || ':' || lower(recipient.email), 'contact_admin',
      recipient.email, new.id, 'Nueva consulta: ' || left(new.subject, 180), body_admin,
      public.email_html('Nueva consulta recibida', body_admin), lower(new.email))
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
  insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body, html_body)
  values ('contact_receipt:' || new.id::text, 'contact_receipt', lower(new.email), new.id,
    'Recibimos tu consulta', body_receipt, public.email_html('Recibimos tu consulta', body_receipt))
  on conflict (idempotency_key) do nothing;
  insert into public.email_events(outbox_id, action, detail)
    select o.id, 'queued', 'Confirmación de recepción para la persona consultante'
    from public.email_outbox o
    where o.idempotency_key = 'contact_receipt:' || new.id::text
      and not exists (select 1 from public.email_events e where e.outbox_id = o.id and e.action = 'queued');
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.contact_email_enqueue() from public, anon, authenticated;

create or replace function public.email_failure_alert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare recipient record; body text;
begin
  if new.status = 'failed' and old.status is distinct from 'failed' and new.kind <> 'admin_alert' then
    body := 'Falló el envío de un correo de la cola.' || chr(10) || chr(10)
      || 'Mensaje: ' || new.id::text || chr(10)
      || 'Tipo: ' || new.kind || chr(10)
      || 'Destinatario: ' || new.recipient || chr(10)
      || 'Intentos: ' || new.attempts::text || chr(10)
      || 'Último error: ' || coalesce(new.last_error, 'sin detalle') || chr(10) || chr(10)
      || 'Revisá Gestión → Correo y cola para reintentar.';
    for recipient in
      select r.email from public.email_recipients r
      join public.profiles p on p.id = r.user_id
      where p.role in ('administrador', 'revisor') and r.enabled
        and not exists (select 1 from public.email_optouts o where lower(o.email) = lower(r.email))
    loop
      insert into public.email_outbox(idempotency_key, kind, recipient, subject, body, html_body)
      values ('failure:' || new.id::text || ':' || lower(recipient.email), 'admin_alert', recipient.email,
        'Fallo de correo en la cola', body, public.email_html('Fallo de correo en la cola', body))
      on conflict (idempotency_key) do nothing;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.email_failure_alert() from public, anon, authenticated;
drop trigger if exists email_failure_alert on public.email_outbox;
create trigger email_failure_alert after update on public.email_outbox
  for each row execute function public.email_failure_alert();

-- Hilo de consultas y respuestas desde Gestión.
create table public.contact_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  direction text not null check (direction in ('outbound')),
  actor uuid references auth.users(id) on delete set null,
  request_key uuid unique,
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 10 and 10000),
  created_at timestamptz not null default now()
);
create index contact_messages_request on public.contact_messages(request_id, id);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;
grant select on public.contact_messages to authenticated;
create policy contact_messages_admin on public.contact_messages for select to authenticated
  using ((select public.is_community_admin()));

create or replace function public.contact_thread(target_request uuid)
returns table(id text, direction text, actor uuid, body text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  return query
    with hilo as (
      select 'request:' || r.id::text as id, 'inbound'::text as direction, null::uuid as actor,
        r.message as body, r.created_at as created_at, 0 as orden
      from public.contact_requests r where r.id = target_request
      union all
      select 'message:' || m.id::text, m.direction, m.actor, m.body, m.created_at, 1
      from public.contact_messages m where m.request_id = target_request
    )
    select hilo.id, hilo.direction, hilo.actor, hilo.body, hilo.created_at
    from hilo order by hilo.created_at, hilo.orden, hilo.id;
end $$;
revoke all on function public.contact_thread(uuid) from public, anon;
grant execute on function public.contact_thread(uuid) to authenticated;

create or replace function public.contact_reply(p_request_id uuid, p_expected_version integer, p_subject text,
  p_body text, p_request_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare request public.contact_requests; saved public.contact_messages; existing public.contact_messages;
  site text := coalesce(nullif(current_setting('app.site_url', true), ''), 'https://eest3sf.netlify.app');
  html text;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_request_key is null or p_subject is null or char_length(btrim(p_subject)) not between 1 and 200
    or p_body is null or char_length(btrim(p_body)) not between 10 and 10000 then
    raise exception 'Invalid reply' using errcode = '22023';
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
  insert into public.contact_messages(request_id, direction, actor, request_key, subject, body)
  values (p_request_id, 'outbound', auth.uid(), p_request_key, btrim(p_subject), btrim(p_body))
  returning * into saved;
  update public.contact_requests set status = 'respondida', version = version + 1, updated_at = now()
  where id = p_request_id returning * into request;
  insert into public.contact_history(request_id, actor, status, assigned_to, note)
  values (p_request_id, auth.uid(), 'respondida', request.assigned_to, 'Respuesta enviada por correo');
  html := public.email_html('Respuesta a tu consulta', btrim(p_body));
  insert into public.email_outbox(idempotency_key, kind, recipient, related_contact, subject, body, html_body)
  values ('contact_reply:' || p_request_key::text, 'contact_reply', lower(request.email), p_request_id,
    btrim(p_subject), btrim(p_body), html)
  on conflict (idempotency_key) do nothing;
  insert into public.email_events(outbox_id, action, detail)
    select o.id, 'queued', 'Respuesta institucional a la consulta'
    from public.email_outbox o where o.idempotency_key = 'contact_reply:' || p_request_key::text
      and not exists (select 1 from public.email_events e where e.outbox_id = o.id and e.action = 'queued');
  return jsonb_build_object('request', to_jsonb(request), 'message', to_jsonb(saved), 'duplicate', false);
end $$;
revoke all on function public.contact_reply(uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.contact_reply(uuid, integer, text, text, uuid) to authenticated;

-- Entrada de rebotes/complaints desde el webhook del proveedor.
create or replace function public.email_webhook_event(payload jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_event text; target public.email_outbox; v_message_id text; v_email text;
begin
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid webhook payload' using errcode = '22023';
  end if;
  v_event := lower(regexp_replace(coalesce(payload ->> 'event', ''), '([A-Z])', '_\1', 'g'));
  v_message_id := coalesce(payload ->> 'message-id', payload ->> 'messageId', '');
  v_email := lower(coalesce(payload ->> 'email', ''));
  if v_event not in ('delivered', 'hard_bounce', 'soft_bounce', 'spam', 'complaint', 'unsubscribed', 'blocked', 'invalid', 'deferred') then
    return '';
  end if;
  select * into target from public.email_outbox
    where provider_message_id = v_message_id or provider_message_id = '<' || v_message_id || '>'
    order by created_at desc limit 1;
  if not found then return ''; end if;
  insert into public.email_events(outbox_id, action, detail)
  values (target.id,
    case when v_event = 'delivered' then 'delivered'
      when v_event in ('spam', 'complaint') then 'complaint'
      when v_event = 'unsubscribed' then 'bounce' else 'bounce' end,
    left(v_event || coalesce(': ' || (payload ->> 'reason'), ''), 1000));
  if v_event in ('hard_bounce', 'blocked', 'invalid', 'spam', 'complaint', 'unsubscribed') then
    update public.email_outbox set status = case when v_event in ('hard_bounce', 'blocked', 'invalid') then 'bounced' else 'complained' end,
      updated_at = now() where id = target.id;
    if v_email <> '' then
      insert into public.email_optouts(email, reason) values (v_email, v_event)
        on conflict (email) do update set reason = excluded.reason, created_at = now();
      update public.email_recipients set enabled = false, updated_at = now()
        where lower(email) = v_email;
      update public.email_outbox set status = 'cancelled', updated_at = now()
        where lower(recipient) = v_email and status in ('pending', 'failed');
    end if;
  end if;
  return target.id::text;
end $$;
revoke all on function public.email_webhook_event(jsonb) from public, anon, authenticated;
grant execute on function public.email_webhook_event(jsonb) to service_role;

commit;
