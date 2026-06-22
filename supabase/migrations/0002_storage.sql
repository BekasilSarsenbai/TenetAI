-- Tenet MVP — private audio bucket. Run this in the Supabase SQL editor
-- (storage.objects policies need the dashboard's elevated role).
-- Files are keyed as <user_id>/<meeting_id>.<ext> so the folder = the owner.
-- Idempotent: safe to re-run.

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists recordings_select_own on storage.objects;
create policy recordings_select_own on storage.objects
  for select using (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists recordings_insert_own on storage.objects;
create policy recordings_insert_own on storage.objects
  for insert with check (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists recordings_delete_own on storage.objects;
create policy recordings_delete_own on storage.objects
  for delete using (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );
