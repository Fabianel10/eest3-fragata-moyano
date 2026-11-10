begin;

create table public.backup_snapshots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null unique check (char_length(path) <= 300),
  size_bytes bigint not null check (size_bytes > 0),
  tables jsonb not null,
  created_by uuid references auth.users(id) on delete set null
);
alter table public.backup_snapshots enable row level security;
revoke all on public.backup_snapshots from public, anon, authenticated;
grant select on public.backup_snapshots to authenticated;
grant insert on public.backup_snapshots to service_role;
create policy backup_snapshots_admin on public.backup_snapshots for select to authenticated
  using ((select public.is_community_admin()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('institutional-backups', 'institutional-backups', false, 5242880, array['application/json'])
on conflict (id) do nothing;
create policy backup_storage_admin on storage.objects for select to authenticated
  using (bucket_id = 'institutional-backups' and (select public.is_community_admin()));

commit;
