"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { allowRequest } from "@/lib/ratelimit";
import { sendWelcomeEmail } from "@/lib/email";
import { insertSignup } from "@/lib/waitlist-store";
import type { Dict } from "@/lib/dictionaries";

const schema = z.object({
  email: z.string().email(),
  company: z.string().max(0).optional().default(""), // honeypot
});

// The action stays locale-agnostic: it returns a message KEY and the client
// (WaitlistForm) renders the localized string from the dictionary.
type WaitlistMsgKey = keyof Dict["waitlistMsg"];
export type WaitlistState = { ok: boolean; key: WaitlistMsgKey | "" };

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, key: "invalidEmail" };
  }
  if (parsed.data.company) {
    return { ok: true, key: "onList" }; // honeypot
  }

  const email = parsed.data.email.toLowerCase().trim();

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0").trim();
  if (!(await allowRequest(ip))) {
    return { ok: false, key: "tooMany" };
  }

  // Store the signup in Supabase (no-op if Supabase env isn't configured).
  const result = await insertSignup(email);
  if (result === "error") {
    return { ok: false, key: "error" };
  }

  // Send a simple welcome email (best-effort, never blocks signup).
  try {
    await sendWelcomeEmail(email);
  } catch (err) {
    console.error("[waitlist] welcome email failed:", err);
  }

  return { ok: true, key: "onListLaunch" };
}
