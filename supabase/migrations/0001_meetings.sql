-- Tenet MVP — per-user saved sessions (recording → transcript → summary).
-- Idempotent: safe to re-run.

create table if not exists public.meetings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled session',
  day        text,
  "time"     text,
  dur        text,
  who        text,
  dur_sec    integer,
  audio_path text,          -- path in the 'recordings' storage bucket
  audio_mime text,
  transcript jsonb,         -- TranscriptSegment[]
  summary    jsonb,         -- MeetingSummary
  created_at timestamptz not null default now()
);

create index if not exists meetings_user_created_idx
  on public.meetings (user_id, created_at desc);

alter table public.meetings enable row level security;

-- Each row is visible/writable only by its owner.
drop policy if exists meetings_select_own on public.meetings;
create policy meetings_select_own on public.meetings
  for select using (auth.uid() = user_id);

drop policy if exists meetings_insert_own on public.meetings;
create policy meetings_insert_own on public.meetings
  for insert with check (auth.uid() = user_id);

drop policy if exists meetings_update_own on public.meetings;
create policy meetings_update_own on public.meetings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists meetings_delete_own on public.meetings;
create policy meetings_delete_own on public.meetings
  for delete using (auth.uid() = user_id);
