begin;

create table public.institutional_notifications (
  id bigint generated always as identity primary key,
  request_key uuid unique,
  source_post uuid unique references public.institutional_posts(id),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  topic text not null check (topic in ('novedades','calendario','inscripciones')),
  link text not null check (link in ('novedades.html','calendario.html','index.html#contacto',
    'informatica.html','madera.html','obras.html','comunidad.html')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  withdrawn boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  check (expires_at is null or expires_at > published_at)
);
create index institutional_notifications_feed on public.institutional_notifications(id desc);
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true
);
create table public.notification_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id bigint not null references public.institutional_notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(user_id,notification_id)
);
alter table public.institutional_notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_receipts enable row level security;
revoke all on public.institutional_notifications, public.notification_preferences, public.notification_receipts from public, anon, authenticated;
grant select on public.institutional_notifications to authenticated;
create policy notifications_admin_read on public.institutional_notifications for select to authenticated
  using ((select public.is_community_admin()));
grant select, insert, update on public.notification_preferences to authenticated;
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.notification_receipts to authenticated;
create policy notification_receipts_own on public.notification_receipts for select to authenticated
  using (user_id = (select auth.uid()));

create function public.notifications_list(before_id bigint default null)
returns table(id bigint,title text,body text,topic text,link text,published_at timestamptz,read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id,n.title,n.body,n.topic,n.link,n.published_at,r.read_at
  from public.institutional_notifications n
  join public.profiles p on p.id = (select auth.uid()) and n.topic = any(p.topics)
  left join public.notification_preferences pref on pref.user_id=p.id
  left join public.notification_receipts r on r.notification_id=n.id and r.user_id=p.id
  where coalesce(pref.enabled,true) and not n.withdrawn and n.published_at <= now()
    and (n.expires_at is null or n.expires_at > now())
    and (before_id is null or n.id < before_id)
  order by n.id desc limit 25;
$$;
revoke all on function public.notifications_list(bigint) from public, anon;
grant execute on function public.notifications_list(bigint) to authenticated;

create function public.notification_read(target_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(
    select 1 from public.institutional_notifications n
    join public.profiles p on p.id=auth.uid() and n.topic=any(p.topics)
    left join public.notification_preferences pref on pref.user_id=p.id
    where n.id=target_id and coalesce(pref.enabled,true) and not n.withdrawn and n.published_at<=now()
      and (n.expires_at is null or n.expires_at>now())
  ) then raise exception 'Notification unavailable' using errcode='42501'; end if;
  insert into public.notification_receipts(user_id,notification_id) values(auth.uid(),target_id)
    on conflict do nothing;
end $$;
revoke all on function public.notification_read(bigint) from public, anon;
grant execute on function public.notification_read(bigint) to authenticated;

create function public.notification_create(document jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint; previous public.institutional_notifications; key uuid := (document->>'request_id')::uuid;
begin
  if not public.is_community_admin() then raise exception 'Administrator permission required' using errcode='42501'; end if;
  if key is null then raise exception 'Request identifier required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(key::text,2));
  select * into previous from public.institutional_notifications where request_key=key;
  if found then
    if previous.title is distinct from btrim(document->>'title') or previous.body is distinct from btrim(document->>'body')
      or previous.topic is distinct from document->>'topic' or previous.link is distinct from document->>'link'
      or previous.expires_at is distinct from (document->>'expires_at')::timestamptz
      or ((document->>'published_at') is not null and previous.published_at is distinct from (document->>'published_at')::timestamptz) then
      raise exception 'Request identifier conflict' using errcode='23505';
    end if;
    return previous.id;
  end if;
  insert into public.institutional_notifications(request_key,title,body,topic,link,published_at,expires_at,created_by)
    values(key,btrim(document->>'title'),btrim(document->>'body'),document->>'topic',document->>'link',
      coalesce((document->>'published_at')::timestamptz,now()),(document->>'expires_at')::timestamptz,auth.uid())
    returning id into new_id;
  return new_id;
end $$;
revoke all on function public.notification_create(jsonb) from public, anon;
grant execute on function public.notification_create(jsonb) to authenticated;
create function public.notification_withdraw(target_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_community_admin() then raise exception 'Administrator permission required' using errcode='42501'; end if;
  update public.institutional_notifications set withdrawn=true where id=target_id and source_post is null and not withdrawn;
  if not found then raise exception 'Notification unavailable or managed by publication' using errcode='22023'; end if;
end $$;
revoke all on function public.notification_withdraw(bigint) from public, anon;
grant execute on function public.notification_withdraw(bigint) to authenticated;

create function public.post_notification_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published_at is null then
    update public.institutional_notifications set withdrawn=true where source_post=new.id;
  else
    insert into public.institutional_notifications(source_post,title,body,topic,link,published_at,expires_at,created_by)
      values(new.id,left(new.title,160),left(new.body,2000),'novedades','novedades.html',new.published_at,new.expires_at,auth.uid())
      on conflict(source_post) do update set title=excluded.title,body=excluded.body,
        published_at=excluded.published_at,expires_at=excluded.expires_at,withdrawn=false;
  end if;
  return new;
end $$;
revoke all on function public.post_notification_sync() from public, anon, authenticated;
create trigger post_notification_sync after insert or update on public.institutional_posts
  for each row execute function public.post_notification_sync();
insert into public.institutional_notifications(source_post,title,body,topic,link,published_at,expires_at,created_by)
  select id,left(title,160),left(body,2000),'novedades','novedades.html',published_at,expires_at,updated_by
  from public.institutional_posts where published_at is not null;

commit;
