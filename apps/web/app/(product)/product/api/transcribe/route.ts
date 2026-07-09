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
  let title: string | null = null;
  if (reqType.includes("application/json")) {
    const j = await request.json().catch(() => null);
    const allowed = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    if (typeof j?.url === "string" && allowed && j.url.startsWith(`${allowed}/storage/`)) {
      mediaUrl = j.url;
    }
    if (typeof j?.title === "string") title = j.title.slice(0, 120);
    if (!mediaUrl)
      return NextResponse.json({ error: "bad url" }, { status: 400, headers: CORS });
  } else {
    blob = await request.blob();
  }
  const contentType = reqType && !reqType.includes("json") ? reqType : blob?.type || "audio/webm";
  const hasAudio = !!mediaUrl || (blob ? blob.size > 0 : false);

  // Names/brands the model should not mangle (meeting title + recurring words
  // from the user's recent notes) — fed to Deepgram as keyterms.
  const keyterms = hasAudio ? await collectKeyterms(request, title) : [];

  // Route to whichever provider handles this language best; languages Deepgram
  // doesn't cover (kk, ar, fa, he, …) go straight to Groq Whisper.
  let lines: TranscriptSegment[] | null = null;
  let source = "";
  if (process.env.DEEPGRAM_API_KEY && hasAudio && dgParams(lang)) {
    try {
      lines = await deepgram(blob, mediaUrl, contentType, process.env.DEEPGRAM_API_KEY, lang, keyterms);
      if (lines) source = "deepgram";
    } catch {}
  }
  if (!lines && process.env.GROQ_API_KEY && hasAudio) {
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
        lines = await groqWhisper(gBlob, gType, process.env.GROQ_API_KEY, lang);
        if (lines) source = "groq";
      }
    } catch {}
  }
  if (lines) {
    // Cheap LLM pass fixing obvious STT slips (broken numbers, garbled words).
    // Fail-safe: any problem returns the original lines untouched.
    lines = await polish(lines, process.env.GROQ_API_KEY);
    return NextResponse.json({ lines, source }, { headers: CORS });
  }

  // A provider key is configured, so a real attempt was made above. Don't fake
  // a transcript on failure — return an honest empty result the UI can surface.
  if (process.env.DEEPGRAM_API_KEY || process.env.GROQ_API_KEY) {
    return NextResponse.json({ lines: [], source: "failed" }, { headers: CORS });
  }

  // No provider configured at all — showcase demo so the feature stays visible.
  const demoLines: TranscriptSegment[] = DEMO_TRANSCRIPT_TEXT.map((s, i) => ({
    start: Math.round((i / DEMO_TRANSCRIPT_TEXT.length) * dur),
    speaker: s.speaker,
    text: s.text,
  }));
  return NextResponse.json({ lines: demoLines, source: "demo" }, { headers: CORS });
}

// Per-language routing, empirically tested (see repo history):
// - nova-3 language=multi is the best for its 10 languages (incl. Russian:
//   "Бекасыл" vs nova-2's "Бекасл") and handles code-switching (RU/EN mixes).
// - nova-2 covers many more languages than nova-3.
// - Languages Deepgram lacks (kk, ar, fa, he, …) return null → Groq Whisper.
const NOVA3_MULTI = new Set(["ru", "es", "fr", "de", "hi", "pt", "ja", "it", "nl"]);
const NOVA2_LANGS = new Set([
  "uk", "tr", "pl", "ko", "zh", "sv", "da", "no", "cs", "el", "fi", "hu",
  "ro", "sk", "bg", "id", "ms", "th", "vi", "ca", "et", "lv", "lt",
]);
function dgParams(lang: string): string | null {
  if (lang === "en") return "model=nova-3&language=en";
  if (lang === "auto" || NOVA3_MULTI.has(lang)) return "model=nova-3&language=multi";
  if (NOVA2_LANGS.has(lang)) return `model=nova-2&language=${encodeURIComponent(lang)}`;
  return null;
}

// Deepgram — with diarization (real speaker labels). Accepts raw bytes or a
// link to the recording (Deepgram fetches it itself — no size limits for us).
async function deepgram(
  blob: Blob | null,
  mediaUrl: string | null,
  contentType: string,
  key: string,
  lang: string,
  keyterms: string[] = []
): Promise<TranscriptSegment[] | null> {
  const params = dgParams(lang);
  if (!params) return null;
  // Vocabulary hints — nova-3 takes `keyterm`, nova-2 takes boosted `keywords`.
  // Empirically turns "Супаби и Дипгром" into "Supabase и Deepgram".
  const kt = keyterms
    .slice(0, 12)
    .map((t) => (params.includes("nova-3") ? `&keyterm=${encodeURIComponent(t)}` : `&keywords=${encodeURIComponent(t)}:2`))
    .join("");
  const dgUrl = `https://api.deepgram.com/v1/listen?${params}${kt}&smart_format=true&punctuate=true&diarize=true&utterances=true`;
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

// Words STT models most often mangle: names and brands. Harvest them from the
// meeting title and the user's recent note titles (their recurring vocabulary).
const STOP_WORDS = new Set([
  "meet", "google", "zoom", "teams", "call", "meeting", "session", "live",
  "recording", "запись", "встреча", "созвон", "звонок", "новая", "new", "tab",
]);
async function collectKeyterms(request: Request, title: string | null): Promise<string[]> {
  const terms = new Set<string>();
  const harvest = (s?: string | null) => {
    for (const w of (s || "").split(/[^\p{L}\p{N}'-]+/u)) {
      if (w.length < 3 || w.length > 24) continue;
      if (!/^[A-ZА-ЯЁӘҒҚҢӨҰҮІ]/u.test(w)) continue; // capitalized = likely a name/brand
      if (STOP_WORDS.has(w.toLowerCase())) continue;
      terms.add(w);
    }
  };
  harvest(title);
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const auth = request.headers.get("authorization") || "";
    if (base && anon && auth) {
      const r = await fetch(`${base}/rest/v1/meetings?select=title&order=created_at.desc&limit=12`, {
        headers: { apikey: anon, Authorization: auth },
      });
      if (r.ok) for (const row of (await r.json()) as { title?: string }[]) harvest(row?.title);
    }
  } catch {}
  return [...terms].slice(0, 12);
}

// LLM cleanup of raw STT output — fixes garbled words, broken numbers
// ("800 1000 тенге" → "800 000 тенге") and punctuation, never rewrites
// content. Fail-safe: any problem returns the original lines.
const POLISH_SYS =
  'You clean up raw speech-to-text lines. Fix ONLY obvious transcription mistakes: garbled words, wrong word boundaries, broken numbers, punctuation, capitalization. Keep each line in its original language. Never add, remove, translate, reorder or paraphrase content. If a line is fine, return it unchanged. Reply with JSON exactly like {"lines":[{"i":0,"t":"corrected text"}]} — one item per input line with the same "i".';
async function polish(lines: TranscriptSegment[], key?: string): Promise<TranscriptSegment[]> {
  if (!key || !lines.length) return lines;
  try {
    // chunk long transcripts so each call stays small and fast
    const chunks: { i: number; t: string }[][] = [];
    let cur: { i: number; t: string }[] = [];
    let size = 0;
    lines.forEach((l, i) => {
      cur.push({ i, t: l.text });
      size += l.text.length;
      if (size > 6000) { chunks.push(cur); cur = []; size = 0; }
    });
    if (cur.length) chunks.push(cur);

    const fixed = new Map<number, string>();
    for (const chunk of chunks) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_POLISH_MODEL || "llama-3.3-70b-versatile",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: POLISH_SYS },
            { role: "user", content: JSON.stringify({ lines: chunk }) },
          ],
        }),
      });
      if (!res.ok) return lines;
      const data = await res.json();
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
      for (const it of parsed?.lines || []) {
        if (typeof it?.i === "number" && typeof it?.t === "string" && it.t.trim()) fixed.set(it.i, it.t.trim());
      }
    }
    if (!fixed.size) return lines;
    return lines.map((l, i) => (fixed.has(i) ? { ...l, text: fixed.get(i)! } : l));
  } catch {
    return lines;
  }
}

function extFor(ct: string): string {
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mp4") || ct.includes("m4a")) return "mp4";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  return "webm";
}
