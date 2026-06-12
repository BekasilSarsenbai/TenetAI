"use server";

import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  // honeypot: must stay empty
  company: z.string().max(0).optional().default(""),
});

export type WaitlistState = {
  ok: boolean;
  message: string;
};

/**
 * Phase 0 stub: validates + anti-bot only.
 * Phase 1 wires this to @tenet/db (Supabase) + Resend double opt-in + Upstash rate limit.
 */
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
    // honeypot tripped: pretend success, drop silently
    return { ok: true, message: "You're on the list." };
  }

  // TODO(phase-1): rate-limit by IP, upsert into waitlist_signups, send double opt-in.
  console.log("[waitlist] signup:", parsed.data.email);

  return { ok: true, message: "You're on the list. We'll be in touch." };
}
