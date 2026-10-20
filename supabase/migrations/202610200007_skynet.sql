begin;

create table public.skynet_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null,
  display_name text check (display_name is null or (
    char_length(display_name) between 2 and 40 and display_name ~ '^[[:alpha:] -]+$' and display_name ~ '[[:alpha:]]')),
  privacy_version text not null check (privacy_version = '2026-10-20-skynet'),
  updated_at timestamptz not null default now()
);
create table public.skynet_turns (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  question text not null check (char_length(btrim(question)) between 1 and 300),
  answer jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id,request_id)
);
create index skynet_turns_owner on public.skynet_turns(user_id,id desc);
alter table public.skynet_preferences enable row level security;
alter table public.skynet_turns enable row level security;
revoke all on public.skynet_preferences, public.skynet_turns from public, anon, authenticated;
grant select on public.skynet_preferences, public.skynet_turns to authenticated;
create policy skynet_preferences_owner on public.skynet_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy skynet_turns_owner on public.skynet_turns for select to authenticated
  using (user_id = (select auth.uid()) and created_at > now() - interval '90 days');

create function public.skynet_consent(save_history boolean, policy_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if save_history is null or policy_version is distinct from '2026-10-20-skynet' then
    raise exception 'Explicit consent required' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
  insert into public.skynet_preferences(user_id,enabled,privacy_version)
    values(auth.uid(),save_history,policy_version)
    on conflict(user_id) do update set enabled=excluded.enabled,privacy_version=excluded.privacy_version,updated_at=now();
  delete from public.skynet_turns where user_id=auth.uid()
    and (not save_history or created_at <= now() - interval '90 days');
end $$;

create function public.skynet_history_clear()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
  delete from public.skynet_turns where user_id=auth.uid();
end $$;

create function public.skynet_name_set(nickname text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nickname is not null and (char_length(btrim(nickname)) not between 2 and 40
    or btrim(nickname) !~ '^[[:alpha:] -]+$' or nickname !~ '[[:alpha:]]') then
    raise exception 'Invalid nickname' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
  insert into public.skynet_preferences(user_id,enabled,privacy_version,display_name)
    values(auth.uid(),false,'2026-10-20-skynet',btrim(nickname))
    on conflict(user_id) do update set display_name=excluded.display_name,updated_at=now();
end $$;

create function public.skynet_history_list(before_id bigint default null)
returns table(id bigint,request_id uuid,question text,answer jsonb,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
  delete from public.skynet_turns t where t.user_id=auth.uid() and t.created_at <= now() - interval '90 days';
  return query select t.id,t.request_id,t.question,t.answer,t.created_at from public.skynet_turns t
    join public.skynet_preferences p on p.user_id=t.user_id and p.enabled
    where t.user_id=auth.uid() and (before_id is null or t.id < before_id)
    order by t.id desc limit 30;
end $$;

create function public.skynet_history_append(turn_id uuid, question text, answer jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare previous public.skynet_turns; saved_id bigint; item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
  if not exists(select 1 from public.skynet_preferences where user_id=auth.uid() and enabled) then
    raise exception 'History consent required' using errcode='42501';
  end if;
  if turn_id is null or question is null or char_length(btrim(question)) not between 1 and 300
    or jsonb_typeof(answer) is distinct from 'object'
    or jsonb_typeof(answer->'id') is distinct from 'string'
    or answer->>'id' not in ('carreras','informatica','madera','obras','inscripciones','calendario','cuenta',
      'documentos','horarios','notificaciones','proyectos','contacto','sin-coincidencia','busqueda','privado',
      'saludo','gracias','despedida','identidad','ayuda')
    or jsonb_typeof(answer->'text') is distinct from 'string'
    or char_length(answer->>'text') not between 1 and 4000
    or jsonb_typeof(answer->'links') is distinct from 'array' then
    raise exception 'Invalid conversation turn' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(answer) k where k not in ('id','text','links')) then
    raise exception 'Unknown answer field' using errcode='22023';
  end if;
  if jsonb_array_length(answer->'links') > 8 then raise exception 'Too many sources' using errcode='22023'; end if;
  for item in select * from jsonb_array_elements(answer->'links') loop
    if jsonb_typeof(item) is distinct from 'array' then raise exception 'Invalid source' using errcode='22023'; end if;
    if jsonb_array_length(item) <> 2 or jsonb_typeof(item->0) is distinct from 'string'
      or jsonb_typeof(item->1) is distinct from 'string' or char_length(item->>1) not between 1 and 200
      or char_length(item->>0) > 512
      or item->>0 !~ '^(index|informatica|madera|obras|novedades|calendario|comunidad|privacidad|notificaciones|galeria)\.html([?#][A-Za-z0-9%_=&.-]+)?$' then
      raise exception 'Invalid source' using errcode='22023';
    end if;
  end loop;
  delete from public.skynet_turns where user_id=auth.uid() and created_at <= now() - interval '90 days';
  select * into previous from public.skynet_turns t where t.user_id=auth.uid() and t.request_id=turn_id;
  if found then
    if previous.question is distinct from btrim(question) or previous.answer is distinct from answer then
      raise exception 'Conversation identifier conflict' using errcode='23505';
    end if;
    return previous.id;
  end if;
  insert into public.skynet_turns(user_id,request_id,question,answer)
    values(auth.uid(),turn_id,btrim(question),answer) returning id into saved_id;
  delete from public.skynet_turns where user_id=auth.uid() and id not in (
    select t.id from public.skynet_turns t where t.user_id=auth.uid() order by t.id desc limit 100
  );
  return saved_id;
end $$;

revoke all on function public.skynet_consent(boolean,text), public.skynet_history_clear(),
  public.skynet_history_list(bigint), public.skynet_history_append(uuid,text,jsonb), public.skynet_name_set(text) from public, anon;
grant execute on function public.skynet_consent(boolean,text), public.skynet_history_clear(),
  public.skynet_history_list(bigint), public.skynet_history_append(uuid,text,jsonb), public.skynet_name_set(text) to authenticated;

commit;
