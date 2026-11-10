begin;

alter table public.profiles add column mfa_required boolean not null default false;

create or replace function public.has_admin_role()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.cms_role() = 'administrador'; $$;
revoke all on function public.has_admin_role() from public, anon;
grant execute on function public.has_admin_role() to authenticated;

create or replace function public.is_community_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'administrador'
      and (not mfa_required or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  );
$$;

create or replace function public.profile_mfa_require(p_required boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_admin_role() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_required is null then raise exception 'Invalid preference' using errcode = '22023'; end if;
  if p_required and not exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid() and factor_type = 'totp' and status = 'verified'
  ) then
    raise exception 'Configurá y verificá un factor TOTP antes de exigir 2FA' using errcode = '22023';
  end if;
  update public.profiles set mfa_required = p_required, updated_at = now()
    where id = auth.uid();
  return p_required;
end $$;
revoke all on function public.profile_mfa_require(boolean) from public, anon;
grant execute on function public.profile_mfa_require(boolean) to authenticated;

create function public.auth_sessions_list()
returns table(id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, current boolean)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.created_at, s.updated_at, s.user_agent,
    s.id::text = coalesce(auth.jwt() ->> 'session_id', '') as current
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by s.updated_at desc nulls last
  limit 50;
$$;
revoke all on function public.auth_sessions_list() from public, anon;
grant execute on function public.auth_sessions_list() to authenticated;

create function public.auth_session_revoke(p_session_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_session_id is null then raise exception 'Invalid session' using errcode = '22023'; end if;
  delete from auth.sessions where id = p_session_id and user_id = (select auth.uid());
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.auth_session_revoke(uuid) from public, anon;
grant execute on function public.auth_session_revoke(uuid) to authenticated;

create function public.auth_sessions_revoke_others(p_current_session uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare removed integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_current_session is null then raise exception 'Current session required' using errcode = '22023'; end if;
  delete from auth.sessions
    where user_id = (select auth.uid()) and id <> p_current_session;
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.auth_sessions_revoke_others(uuid) from public, anon;
grant execute on function public.auth_sessions_revoke_others(uuid) to authenticated;

commit;
