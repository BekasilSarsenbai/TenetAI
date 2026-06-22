// Waitlist storage via Supabase REST (PostgREST), using the server-only
// service_role key. No direct Postgres connection / Drizzle needed.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ready(): boolean {
  return !!(URL && KEY);
}

export type SignupRow = { email: string; status: string; created_at: string };

/** Insert a signup. Returns "ok", "exists" (duplicate), "skip" (not configured) or "error". */
export async function insertSignup(email: string): Promise<"ok" | "exists" | "skip" | "error"> {
  if (!ready()) {
    console.log(`[waitlist] (no Supabase env) signup: ${email}`);
    return "skip";
  }
  try {
    const res = await fetch(`${URL}/rest/v1/waitlist_signups`, {
      method: "POST",
      headers: {
        apikey: KEY!,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, status: "subscribed" }),
    });
    if (res.ok) return "ok";
    if (res.status === 409) return "exists"; // unique violation — already on the list
    console.error("[waitlist] insert failed:", res.status, await res.text());
    return "error";
  } catch (e) {
    console.error("[waitlist] insert error:", e);
    return "error";
  }
}

/** Total count + the latest 100 signups (newest first). */
export async function getSignups(): Promise<{ count: number; rows: SignupRow[] }> {
  if (!ready()) return { count: 0, rows: [] };
  const res = await fetch(
    `${URL}/rest/v1/waitlist_signups?select=email,status,created_at&order=created_at.desc&limit=100`,
    {
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
      cache: "no-store",
    },
  );
  const rows: SignupRow[] = res.ok ? await res.json() : [];
  const range = res.headers.get("content-range"); // "0-99/123"
  const count = range && range.includes("/") ? Number(range.split("/")[1]) : rows.length;
  return { count: Number.isFinite(count) ? count : rows.length, rows };
}

export const waitlistConfigured = ready;
