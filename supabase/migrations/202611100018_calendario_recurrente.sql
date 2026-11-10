begin;

alter table public.calendar_events
  add column recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'monthly', 'yearly')),
  add column recurrence_until date;

create or replace function public.calendar_event_save(event_id uuid, expected_version integer, document jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare saved public.calendar_events; fecha date; hasta date; recurrencia text;
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if event_id is null or expected_version is null or expected_version < 0
    or jsonb_typeof(document) is distinct from 'object' then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  fecha := (document ->> 'event_date')::date;
  recurrencia := coalesce(nullif(document ->> 'recurrence', ''), 'none');
  hasta := nullif(document ->> 'recurrence_until', '')::date;
  if fecha is null or fecha < date '2000-01-01' or fecha > date '2100-12-31'
    or coalesce(document ->> 'title', '') !~ '[^[:space:]]'
    or char_length(btrim(document ->> 'title')) not between 1 and 300
    or coalesce(document ->> 'type', '') not in ('feriado', 'local', 'docente', 'turistico', 'efemeride', 'tecnica')
    or recurrencia not in ('none', 'weekly', 'monthly', 'yearly')
    or (recurrencia = 'none' and hasta is not null)
    or (hasta is not null and (hasta < fecha or hasta > date '2100-12-31'))
    or char_length(coalesce(document ->> 'description', '')) > 2000
    or char_length(coalesce(document ->> 'source', '')) > 300
    or char_length(coalesce(document ->> 'responsible', '')) > 200 then
    raise exception 'Invalid event fields' using errcode = '22023';
  end if;
  if expected_version = 0 then
    insert into public.calendar_events(id, event_date, title, type, description, source, responsible,
      published, recurrence, recurrence_until, updated_by)
    values (event_id, fecha, btrim(document ->> 'title'), document ->> 'type',
      coalesce(document ->> 'description', ''), coalesce(document ->> 'source', ''),
      coalesce(document ->> 'responsible', ''), coalesce((document ->> 'published')::boolean, false),
      recurrencia, hasta, auth.uid())
    returning * into saved;
  else
    update public.calendar_events set
      event_date = fecha, title = btrim(document ->> 'title'), type = document ->> 'type',
      description = coalesce(document ->> 'description', ''), source = coalesce(document ->> 'source', ''),
      responsible = coalesce(document ->> 'responsible', ''),
      published = coalesce((document ->> 'published')::boolean, published),
      recurrence = recurrencia, recurrence_until = hasta,
      version = version + 1, updated_at = now(), updated_by = auth.uid()
    where id = event_id and version = expected_version
    returning * into saved;
    if not found then raise exception 'Concurrent update or missing event' using errcode = '40001'; end if;
  end if;
  return to_jsonb(saved);
end $$;

commit;
