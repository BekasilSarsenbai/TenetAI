import { NextResponse } from "next/server";
import { fmt, type TranscriptSegment } from "@/lib/data";
import { CORS, getUserId } from "@/lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type ChatMsg = { role: "user" | "assistant"; content: string };

function transcriptText(t: TranscriptSegment[]): string {
  return t.map((s) => `[${fmt(s.start)}] ${s.speaker}: ${s.text}`).join("\n");
}

const SYSTEM = `You are Tenet, an assistant that answers questions about ONE specific meeting.
Rules:
- Answer using ONLY the meeting transcript below. Never invent facts or use outside knowledge.
- If the transcript doesn't contain the answer, say so plainly (e.g. "Этого не было в этой встрече.").
- Be concise and direct. When you reference a specific moment, cite its timestamp like [12:30].
- Reply in the same language the user asked in.`;

export async function POST(request: Request) {
  if (!(await getUserId(request)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });

  const body = await request.json().catch(() => null);
  const transcript: TranscriptSegment[] = body?.transcript ?? [];
  const question = String(body?.question ?? "").slice(0, 2000).trim();
  const history: ChatMsg[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (m: ChatMsg) =>
            m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
        .slice(-8)
    : [];

  if (!question) return NextResponse.json({ answer: "" }, { headers: CORS });
  if (!transcript.length)
    return NextResponse.json(
      { answer: "У этой встречи пока нет транскрипта — отвечать не по чему." },
      { headers: CORS }
    );

  const system = `${SYSTEM}\n\nMeeting transcript:\n${transcriptText(transcript)}`;
  const messages: ChatMsg[] = [...history, { role: "user", content: question }];

  // Same provider cascade as /summarize.
  if (process.env.GROQ_API_KEY) {
    const a = await openaiChat(
      "https://api.groq.com/openai/v1",
      process.env.GROQ_API_KEY,
      process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
      system,
      messages
    );
    if (a) return NextResponse.json({ answer: a, source: "groq" }, { headers: CORS });
  }
  if (process.env.GEMINI_API_KEY) {
    const a = await gemini(process.env.GEMINI_API_KEY, system, messages);
    if (a) return NextResponse.json({ answer: a, source: "gemini" }, { headers: CORS });
  }
  if (process.env.MISTRAL_API_KEY) {
    const a = await openaiChat(
      "https://api.mistral.ai/v1",
      process.env.MISTRAL_API_KEY,
      process.env.MISTRAL_MODEL || "mistral-small-latest",
      system,
      messages
    );
    if (a) return NextResponse.json({ answer: a, source: "mistral" }, { headers: CORS });
  }

  return NextResponse.json(
    { answer: "AI-чат сейчас недоступен — на сервере не настроен ключ модели.", source: "none" },
    { headers: CORS }
  );
}

// OpenAI-compatible chat (Groq, Mistral, …).
async function openaiChat(
  baseUrl: string,
  key: string,
  model: string,
  system: string,
  messages: ChatMsg[]
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 700,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

// Google Gemini (system instruction + turn-based contents).
async function gemini(key: string, system: string, messages: ChatMsg[]): Promise<string | null> {
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
