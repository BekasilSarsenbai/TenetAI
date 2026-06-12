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
  // honeypot tripped: silently succeed
  if (parsed.data.company) {
    return { ok: true, message: "You're on the list." };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // rate limit by IP (no-op if Upstash not configured)
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0").trim();
  if (!(await allowRequest(ip))) {
    return { ok: false, message: "Too many attempts. Please try again later." };
  }

  let token: string | null = null;
  let alreadyConfirmed = false;

  if (process.env.DATABASE_URL) {
    // imported lazily so the app builds/runs without a DB configured
    const { getDb, waitlistSignups } = await import("@tenet/db");
    const db = getDb();
    const [row] = await db
      .insert(waitlistSignups)
      .values({ email })
      .onConflictDoUpdate({ target: waitlistSignups.email, set: { email } })
      .returning({
        token: waitlistSignups.confirmToken,
        status: waitlistSignups.status,
      });
    token = row?.token ?? null;
    alreadyConfirmed = row?.status === "confirmed";
  } else {
    console.log("[waitlist] (no DATABASE_URL) signup:", email);
  }

  if (alreadyConfirmed) {
    return { ok: true, message: "You're already on the list. See you at launch." };
  }

  if (token) {
    try {
      await sendConfirmEmail(email, token);
    } catch (err) {
      console.error("[waitlist] confirm email failed:", err);
    }
    return { ok: true, message: "Almost there. Check your inbox to confirm." };
  }

  // No DB configured (local/dev): treat as success.
  return { ok: true, message: "You're on the list. We'll be in touch." };
}
