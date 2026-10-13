begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  role text not null default 'comunidad'
    check (role in ('comunidad', 'alumno', 'profesor', 'administrador')),
  requested_role text not null default 'comunidad'
    check (requested_role in ('comunidad', 'alumno', 'profesor')),
  email_notifications boolean not null default false,
  topics text[] not null default array['novedades']::text[]
    check (topics <@ array['novedades', 'calendario', 'inscripciones']::text[]
      and cardinality(topics) <= 3 and array_position(topics, null) is null),
  privacy_version text not null,
  privacy_accepted_at timestamptz not null default now(),
  notification_consent_at timestamptz,
  notification_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create function public.is_community_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'administrador'
  );
$$;

revoke all on function public.is_community_admin() from public, anon;
grant execute on function public.is_community_admin() to authenticated;

create policy profiles_read on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.is_community_admin()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, email_notifications, topics) on public.profiles to authenticated;

create function public.create_community_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  metadata jsonb := new.raw_user_meta_data;
  requested text := metadata ->> 'requested_role';
  display_name text := btrim(metadata ->> 'full_name');
  wants_notifications boolean;
begin
  if display_name is null or char_length(display_name) not between 2 and 100 then
    raise exception 'A valid full name is required';
  end if;
  if requested is null or requested not in ('comunidad', 'alumno', 'profesor') then
    raise exception 'Invalid public profile';
  end if;
  if metadata ->> 'privacy_version' is distinct from '2026-10-06' then
    raise exception 'Current privacy information must be accepted';
  end if;
  if jsonb_typeof(metadata -> 'email_notifications') is distinct from 'boolean' then
    raise exception 'Explicit notification preference is required';
  end if;
  wants_notifications := (metadata ->> 'email_notifications')::boolean;
  insert into public.profiles (
    id, full_name, requested_role, role, email_notifications,
    privacy_version, notification_consent_at
  ) values (
    new.id, display_name, requested, 'comunidad', wants_notifications,
    '2026-10-06', case when wants_notifications then now() else null end
  );
  return new;
end;
$$;

revoke all on function public.create_community_profile() from public, anon, authenticated;
create trigger on_community_user_created
after insert on auth.users
for each row execute function public.create_community_profile();

create function public.track_community_preferences()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name := btrim(new.full_name);
  new.updated_at := now();
  if new.email_notifications is distinct from old.email_notifications then
    if new.email_notifications then
      new.notification_consent_at := now();
      new.notification_revoked_at := null;
    else
      new.notification_revoked_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.track_community_preferences() from public, anon, authenticated;
create trigger on_community_preferences_updated
before update on public.profiles
for each row execute function public.track_community_preferences();

create function public.approve_profile(target_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_community_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  update public.profiles
  set role = requested_role
  where id = target_id and role = 'comunidad' and requested_role in ('alumno', 'profesor');
  if not found then
    raise exception 'No pending profile request found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.approve_profile(uuid) from public, anon;
grant execute on function public.approve_profile(uuid) to authenticated;

create index profiles_pending_requests on public.profiles (created_at)
where role = 'comunidad' and requested_role in ('alumno', 'profesor');

commit;
