-- ============================================================
-- TransTrak Storage, Safety, and Admin Audit Setup
-- ============================================================
-- Apply this after the initial schema and RLS policies.

-- Driver verification documents are expected to be uploaded to this private
-- bucket before a driver submits the generated storage URL in the mobile app.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'driver-verifications',
  'driver-verifications',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Drivers can upload own verification documents" on storage.objects;
create policy "Drivers can upload own verification documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'driver-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Drivers and admins can read verification documents" on storage.objects;
create policy "Drivers and admins can read verification documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-verifications'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "Drivers can replace own verification documents" on storage.objects;
create policy "Drivers can replace own verification documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'driver-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'driver-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins can delete verification documents" on storage.objects;
create policy "Admins can delete verification documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'driver-verifications'
  and public.is_admin(auth.uid())
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor_id
on public.admin_audit_logs(actor_id);

create index if not exists idx_admin_audit_logs_entity
on public.admin_audit_logs(entity_table, entity_id);

create index if not exists idx_admin_audit_logs_created_at
on public.admin_audit_logs(created_at);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
create policy "Admins can insert audit logs"
on public.admin_audit_logs
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.is_admin(auth.uid())
);

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
on public.admin_audit_logs
for select
to authenticated
using (public.is_admin(auth.uid()));
