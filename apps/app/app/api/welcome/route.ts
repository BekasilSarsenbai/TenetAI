import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Sends a one-off welcome email on sign-up via Resend. Best-effort: a missing
// key or a Resend hiccup never blocks the user — we just skip the email.
export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Tenet <onboarding@resend.dev>";
  if (!key) return NextResponse.json({ sent: false, reason: "no_key" });

  const body = await request.json().catch(() => null);
  const email: string | undefined = body?.email;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ sent: false, reason: "bad_email" });
  }

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
    <h1 style="font-size:22px;margin:0 0 12px">Welcome to Tenet 🎉</h1>
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 16px">
      You're in. Tenet records your calls, transcribes them, and hands you the
      summary in seconds — with every key point linked to the exact moment it was said.
      No more rewatching a meeting to find that one thing.
    </p>
    <p style="margin:0 0 24px">
      <a href="https://app.tenet.blog" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px">
        Record your first session →
      </a>
    </p>
    <p style="font-size:13px;color:#888;margin:0">
      Never rewatch a recording again. — The Tenet team
    </p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Welcome to Tenet 🎉",
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ sent: false, reason: "resend_error", detail });
    }
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false, reason: "fetch_failed" });
  }
}
