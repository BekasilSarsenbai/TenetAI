import { NextResponse } from "next/server";
import { fmt, type KeyMoment, type MeetingSummary, type TranscriptSegment } from "@/lib/data";
import { CORS, getUserId } from "@/lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const SCHEMA = {
  type: "object",
  properties: {
    tldr: { type: "string" },
    keyPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          start: { type: "integer" },
          quote: { type: "string" },
          speaker: { type: "string" },
        },
        required: ["text", "start", "quote", "speaker"],
      },
    },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["tldr", "keyPoints", "nextSteps"],
};

export async function POST(request: Request) {
  if (!(await getUserId(request)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });

  const body = await request.json().catch(() => null);
  const transcript: TranscriptSegment[] = body?.transcript ?? [];
  const durSec: number = body?.durSec ?? 0;

  if (!transcript.length) return NextResponse.json({ summary: null }, { headers: CORS });

  // Try whichever LLM provider is configured, in priority order.
  // Groq first: it's fast and reliable on the free tier. Gemini/Mistral are
  // fallbacks (Gemini only kicks in if its project has free-tier quota).
  if (process.env.GROQ_API_KEY) {
    try {
      const s = await openaiChat(
        "https://api.groq.com/openai/v1",
        process.env.GROQ_API_KEY,
        process.env.GROQ_SUMMARY_MODEL || "llama-3.3-70b-versatile",
        transcript
      );
      if (s) return NextResponse.json({ summary: s, source: "groq" }, { headers: CORS });
    } catch {}
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const s = await gemini(transcript, process.env.GEMINI_API_KEY);
      if (s) return NextResponse.json({ summary: s, source: "gemini" }, { headers: CORS });
    } catch {}
  }
  if (process.env.MISTRAL_API_KEY) {
    try {
      const s = await openaiChat(
        "https://api.mistral.ai/v1",
        process.env.MISTRAL_API_KEY,
        process.env.MISTRAL_MODEL || "mistral-small-latest",
        transcript
      );
      if (s) return NextResponse.json({ summary: s, source: "mistral" }, { headers: CORS });
    } catch {}
  }

  return NextResponse.json({ summary: extractive(transcript, durSec), source: "demo" }, { headers: CORS });
}

function transcriptText(transcript: TranscriptSegment[]): string {
  return transcript.map((t) => `[${fmt(t.start)}] ${t.speaker}: ${t.text}`).join("\n");
}

const INSTRUCTIONS = `You are a meeting-notes assistant. Summarize the transcript below.
Use ONLY information present in the transcript — never invent facts.
- tldr: a 1-2 sentence summary of what mattered.
- keyPoints: the 3-5 most important moments. For each: text (a short paraphrase), start (the integer second taken from the matching line's timestamp), quote (the exact line text), speaker.
- nextSteps: 2-4 concrete action items implied by the conversation.`;

// Google Gemini (structured output via responseSchema).
async function gemini(
  transcript: TranscriptSegment[],
  key: string
): Promise<MeetingSummary | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = `${INSTRUCTIONS}\n\nTranscript:\n${transcriptText(transcript)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return normalize(JSON.parse(stripFences(text)), transcript);
}

// Any OpenAI-compatible chat endpoint (Groq, Mistral, …) with JSON mode.
async function openaiChat(
  baseUrl: string,
  key: string,
  model: string,
  transcript: TranscriptSegment[]
): Promise<MeetingSummary | null> {
  const prompt = `${INSTRUCTIONS}

Respond with a JSON object of this exact shape:
{"tldr": string, "keyPoints": [{"text": string, "start": number, "quote": string, "speaker": string}], "nextSteps": [string]}

Transcript:
${transcriptText(transcript)}`;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a meeting-notes assistant. Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;
  return normalize(JSON.parse(stripFences(text)), transcript);
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function normalize(parsed: unknown, transcript: TranscriptSegment[]): MeetingSummary | null {
  const p = parsed as Partial<MeetingSummary>;
  if (!p || typeof p.tldr !== "string") return null;
  const maxStart = transcript[transcript.length - 1]?.start ?? 0;
  const keyPoints: KeyMoment[] = (p.keyPoints ?? [])
    .filter((k) => k && k.text && k.quote)
    .map((k) => ({
      text: String(k.text),
      start: clamp(Math.round(Number(k.start) || 0), 0, maxStart),
      quote: String(k.quote),
      speaker: String(k.speaker || "Speaker"),
    }));
  const nextSteps = (p.nextSteps ?? []).map((s) => String(s)).filter(Boolean);
  return { tldr: p.tldr, keyPoints, nextSteps };
}

// No-AI fallback: pull the most substantial lines as key moments.
function extractive(transcript: TranscriptSegment[], durSec: number): MeetingSummary {
  const ranked = transcript
    .map((t) => ({ t, len: t.text.split(/\s+/).filter(Boolean).length }))
    .filter((x) => x.t.text.length > 18)
    .sort((a, b) => b.len - a.len)
    .slice(0, 4)
    .sort((a, b) => a.t.start - b.t.start);

  const keyPoints: KeyMoment[] = ranked.map((x) => ({
    text: truncate(x.t.text, 84),
    start: x.t.start,
    quote: x.t.text,
    speaker: x.t.speaker,
  }));

  const speakers = new Set(transcript.map((t) => t.speaker)).size;
  const total = durSec || transcript[transcript.length - 1]?.start || 0;
  const tldr = `A ${fmt(total)} conversation between ${speakers} speaker${
    speakers > 1 ? "s" : ""
  }. Add a free AI key (Gemini, Groq or Mistral) for a written summary — these highlights come straight from the transcript.`;

  return {
    tldr,
    keyPoints,
    nextSteps: [
      "Review the highlighted moments above",
      "Share the transcript with the team",
      "Follow up on any open questions raised",
    ],
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
