import { Resend } from "resend";

function confirmHtml(url: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#0B0C0F;color:#ECEDEF;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0C0F;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%">
        <tr><td style="padding:0 24px">
          <div style="font-weight:700;font-size:18px;letter-spacing:-.02em;color:#F4F2EC;margin-bottom:28px">Tenet</div>
          <h1 style="font-size:24px;line-height:1.25;letter-spacing:-.02em;color:#ECEDEF;margin:0 0 14px">Confirm your spot on the waitlist</h1>
          <p style="font-size:15px;line-height:1.6;color:#9A9DA6;margin:0 0 26px">
            One click and you're on the list. We'll email you a single time when Tenet opens up. No spam.
          </p>
          <a href="${url}" style="display:inline-block;background:#F4F2EC;color:#111;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">Confirm my email</a>
          <p style="font-size:12.5px;line-height:1.6;color:#62656E;margin:28px 0 0">
            If the button doesn't work, paste this link:<br>
            <span style="color:#9A9DA6">${url}</span>
          </p>
          <p style="font-size:12.5px;color:#62656E;margin:24px 0 0">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Sends the double opt-in email. Falls back to a console log when RESEND_API_KEY is absent. */
export async function sendConfirmEmail(to: string, token: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${base}/confirm?token=${encodeURIComponent(token)}`;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Tenet <onboarding@resend.dev>";

  if (!key) {
    console.log(`[email] (no RESEND_API_KEY) confirm link for ${to}: ${url}`);
    return;
  }

  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to,
    subject: "Confirm your spot on the Tenet waitlist",
    html: confirmHtml(url),
  });
}
