"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { allowRequest } from "@/lib/ratelimit";
import { sendConfirmEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  company: z.string().max(0).optional().default(""), // honeypot
});

export type WaitlistState = { ok: boolean; message: string };

// Single opt-in by default (just collect the email). Flip WAITLIST_DOUBLE_OPTIN=true
// later (with a verified Resend domain) to send a confirmation email instead.
const DOUBLE_OPTIN = process.env.WAITLIST_DOUBLE_OPTIN === "true";

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (parsed.data.company) {
    return { ok: true, message: "You're on the list." }; // honeypot
  }

  const email = parsed.data.email.toLowerCase().trim();

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0").trim();
  if (!(await allowRequest(ip))) {
    return { ok: false, message: "Too many attempts. Please try again later." };
  }

  let token: string | null = null;

  if (process.env.DATABASE_URL) {
    const { getDb, waitlistSignups } = await import("@tenet/db");
    const db = getDb();
    const [row] = await db
      .insert(waitlistSignups)
      .values({ email, status: DOUBLE_OPTIN ? "pending" : "subscribed" })
      .onConflictDoUpdate({ target: waitlistSignups.email, set: { email } })
      .returning({ token: waitlistSignups.confirmToken });
    token = row?.token ?? null;
  } else {
    console.log("[waitlist] (no DATABASE_URL) signup:", email);
  }

  if (DOUBLE_OPTIN && token) {
    try {
      await sendConfirmEmail(email, token);
    } catch (err) {
      console.error("[waitlist] confirm email failed:", err);
    }
    return { ok: true, message: "Almost there. Check your inbox to confirm." };
  }

  return { ok: true, message: "You're on the list. We'll email you at launch." };
}
