import { NextResponse } from "next/server";
import { DEMO_TRANSCRIPT_TEXT, type TranscriptSegment } from "@/lib/data";
import { CORS, getUserId } from "@/lib/route-auth";

export const runtime = "nodejs";
// Full recordings are transcribed in one call (diarization needs the whole
// file) — give long meetings room. Vercel clamps this to the plan's max.
export const maxDuration = 300;

type DgUtterance = { start: number; transcript: string; speaker?: number };
type WhisperSegment = { start: number; text: string };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  if (!(await getUserId(request)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });

  const url = new URL(request.url);
  const dur = Math.max(1, Number(url.searchParams.get("dur")) || 30);
  const lang = (url.searchParams.get("lang") || "auto").toLowerCase();

  // Two input modes: JSON {url} — a (signed) link to the full recording in our
  // storage (no request-size limit, best diarization), or a raw audio body.
  const reqType = request.headers.get("content-type") || "";
  let blob: Blob | null = null;
  let mediaUrl: string | null = null;
  if (reqType.includes("application/json")) {
    const j = await request.json().catch(() => null);
    const allowed = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    if (typeof j?.url === "string" && allowed && j.url.startsWith(`${allowed}/storage/`)) {
      mediaUrl = j.url;
    }
    if (!mediaUrl)
      return NextResponse.json({ error: "bad url" }, { status: 400, headers: CORS });
  } else {
    blob = await request.blob();
  }
  const contentType = reqType && !reqType.includes("json") ? reqType : blob?.type || "audio/webm";
  const hasAudio = !!mediaUrl || (blob ? blob.size > 0 : false);

  // Try whichever provider is configured, in priority order. Kazakh isn't on
  // Deepgram's nova models — it falls through to Groq Whisper below.
  if (process.env.DEEPGRAM_API_KEY && hasAudio) {
    try {
      const lines = await deepgram(blob, mediaUrl, contentType, process.env.DEEPGRAM_API_KEY, lang);
      if (lines) return NextResponse.json({ lines, source: "deepgram" }, { headers: CORS });
    } catch {}
  }
  if (process.env.GROQ_API_KEY && hasAudio) {
    try {
      // Groq needs bytes — pull them from storage when we only have the link.
      let gBlob = blob;
      let gType = contentType;
      if (!gBlob && mediaUrl) {
        const r = await fetch(mediaUrl);
        if (r.ok) {
          gBlob = await r.blob();
          gType = r.headers.get("content-type") || "audio/webm";
        }
      }
      if (gBlob && gBlob.size > 0) {
        const lines = await groqWhisper(gBlob, gType, process.env.GROQ_API_KEY, lang);
        if (lines) return NextResponse.json({ lines, source: "groq" }, { headers: CORS });
      }
    } catch {}
  }

  // A provider key is configured, so a real attempt was made above. Don't fake
  // a transcript on failure — return an honest empty result the UI can surface.
  if (process.env.DEEPGRAM_API_KEY || process.env.GROQ_API_KEY) {
    return NextResponse.json({ lines: [], source: "failed" }, { headers: CORS });
  }

  // No provider configured at all — showcase demo so the feature stays visible.
  const lines: TranscriptSegment[] = DEMO_TRANSCRIPT_TEXT.map((s, i) => ({
    start: Math.round((i / DEMO_TRANSCRIPT_TEXT.length) * dur),
    speaker: s.speaker,
    text: s.text,
  }));
  return NextResponse.json({ lines, source: "demo" }, { headers: CORS });
}

// Deepgram model choice, empirically tested (see repo history):
// nova-3 language=multi transcribes Russian noticeably better than nova-2
// detect_language ("Бекасыл" vs "Бекасл") and handles RU/EN code-switching.
function dgParams(lang: string): string {
  if (lang === "en") return "model=nova-3&language=en";
  if (lang === "auto" || lang === "ru") return "model=nova-3&language=multi";
  return `model=nova-2&language=${encodeURIComponent(lang)}`;
}

// Deepgram — with diarization (real speaker labels). Accepts raw bytes or a
// link to the recording (Deepgram fetches it itself — no size limits for us).
async function deepgram(
  blob: Blob | null,
  mediaUrl: string | null,
  contentType: string,
  key: string,
  lang: string
): Promise<TranscriptSegment[] | null> {
  const dgUrl = `https://api.deepgram.com/v1/listen?${dgParams(lang)}&smart_format=true&punctuate=true&diarize=true&utterances=true`;
  const res = await fetch(dgUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": mediaUrl ? "application/json" : contentType,
    },
    body: mediaUrl ? JSON.stringify({ url: mediaUrl }) : blob!,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const utts: DgUtterance[] = data?.results?.utterances ?? [];
  const lines: TranscriptSegment[] = utts
    .map((u) => ({
      start: Math.round(u.start),
      speaker: typeof u.speaker === "number" ? `Speaker ${u.speaker + 1}` : "Speaker",
      text: (u.transcript || "").trim(),
    }))
    .filter((l) => l.text);
  return lines.length ? lines : null;
}

// Groq — Whisper large v3 (no diarization, but real timestamps).
async function groqWhisper(
  blob: Blob,
  contentType: string,
  key: string,
  lang: string
): Promise<TranscriptSegment[] | null> {
  const form = new FormData();
  form.append("file", blob, `audio.${extFor(contentType)}`);
  form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");
  if (lang !== "auto") form.append("language", lang);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const segs: WhisperSegment[] = data?.segments ?? [];
  const lines: TranscriptSegment[] = segs
    .map((s) => ({ start: Math.round(s.start), speaker: "Speaker", text: (s.text || "").trim() }))
    .filter((l) => l.text);
  return lines.length ? lines : null;
}

function extFor(ct: string): string {
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mp4") || ct.includes("m4a")) return "mp4";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  return "webm";
}
