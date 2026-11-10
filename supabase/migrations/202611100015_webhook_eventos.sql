begin;

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
