"use client";

// Per-user persistence for saved sessions. Backed by Supabase: the `meetings`
// table (RLS-scoped to auth.uid()) + the private `recordings` storage bucket.
// All calls are no-ops when Supabase isn't configured (demo mode), so the app
// still runs with the in-memory showcase dataset.

import { createClient } from "./supabase/client";
import { mimeExt } from "./report";
import { fmt, type Meeting, type MeetingSummary, type TranscriptSegment } from "./data";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseEnabled = URL.startsWith("https://") && KEY.startsWith("eyJ");

const BUCKET = "recordings";
const SIGNED_TTL = 60 * 60 * 6; // 6h — long enough for a session

type Row = {
  id: string;
  title: string;
  who: string | null;
  dur_sec: number | null;
  audio_path: string | null;
  audio_mime: string | null;
  transcript: TranscriptSegment[] | null;
  summary: MeetingSummary | null;
  created_at: string;
};

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function relDay(d: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type SB = ReturnType<typeof createClient>;

async function rowToMeeting(sb: SB, r: Row): Promise<Meeting> {
  let audioUrl: string | undefined;
  if (r.audio_path) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(r.audio_path, SIGNED_TTL);
    audioUrl = data?.signedUrl;
  }
  const created = new Date(r.created_at);
  return {
    id: r.id,
    title: r.title,
    day: relDay(created),
    time: hhmm(created),
    dur: r.dur_sec ? fmt(r.dur_sec) : "—",
    who: r.who || "You",
    durSec: r.dur_sec ?? undefined,
    audioUrl,
    audioMime: r.audio_mime ?? undefined,
    transcript: r.transcript ?? undefined,
    summary: r.summary ?? undefined,
  };
}

/** Every saved session for the signed-in user, newest first. */
export async function listMeetings(): Promise<Meeting[]> {
  if (!supabaseEnabled) return [];
  const sb = createClient();
  const { data, error } = await sb
    .from("meetings")
    .select("id,title,who,dur_sec,audio_path,audio_mime,transcript,summary,created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return Promise.all((data as Row[]).map((r) => rowToMeeting(sb, r)));
}

export type MeetingSeed = {
  title: string;
  who?: string;
  durSec?: number;
  blob?: Blob;
  transcript?: TranscriptSegment[];
  summary?: MeetingSummary;
};

/** Upload audio (if any) + insert the row. Returns the saved Meeting, or null. */
export async function createMeeting(seed: MeetingSeed): Promise<Meeting | null> {
  if (!supabaseEnabled) return null;
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const id = crypto.randomUUID();
  let audioPath: string | null = null;
  const audioMime = seed.blob?.type ?? null;

  if (seed.blob) {
    audioPath = `${uid}/${id}.${mimeExt(seed.blob.type)}`;
    const up = await sb.storage
      .from(BUCKET)
      .upload(audioPath, seed.blob, { contentType: seed.blob.type, upsert: true });
    if (up.error) audioPath = null; // saving the note still beats losing it
  }

  const row = {
    id,
    user_id: uid,
    title: seed.title,
    who: seed.who ?? "You",
    dur_sec: seed.durSec ?? null,
    audio_path: audioPath,
    audio_mime: audioMime,
    transcript: seed.transcript ?? null,
    summary: seed.summary ?? null,
  };
  const { error } = await sb.from("meetings").insert(row);
  if (error) return null;
  return rowToMeeting(sb, { ...row, created_at: new Date().toISOString() } as Row);
}

export async function renameMeetingRow(id: string, title: string): Promise<void> {
  if (!supabaseEnabled) return;
  await createClient().from("meetings").update({ title }).eq("id", id);
}

export async function updateMeetingContent(
  id: string,
  patch: { transcript?: TranscriptSegment[]; summary?: MeetingSummary },
): Promise<void> {
  if (!supabaseEnabled) return;
  const fields: Record<string, unknown> = {};
  if ("transcript" in patch) fields.transcript = patch.transcript ?? null;
  if ("summary" in patch) fields.summary = patch.summary ?? null;
  if (Object.keys(fields).length === 0) return;
  await createClient().from("meetings").update(fields).eq("id", id);
}

export async function deleteMeetingRow(id: string): Promise<void> {
  if (!supabaseEnabled) return;
  const sb = createClient();
  // Grab the audio path first so we can clean up the storage object too.
  const { data } = await sb.from("meetings").select("audio_path").eq("id", id).maybeSingle();
  const audioPath = (data as { audio_path: string | null } | null)?.audio_path;
  await sb.from("meetings").delete().eq("id", id);
  if (audioPath) {
    try {
      await sb.storage.from(BUCKET).remove([audioPath]);
    } catch {
      /* orphaned audio is harmless */
    }
  }
}
