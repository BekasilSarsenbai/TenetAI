// Shared config. The anon key is a public client key (safe to ship in the
// extension — RLS protects the data, exactly like in the web app).
export const APP_URL = "https://app.tenet.blog";
export const SUPABASE_URL = "https://texgkhxosinhasstxpxk.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleGdraHhvc2luaGFzc3R4cHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ0OTcsImV4cCI6MjA5NjgxMDQ5N30.QSufHLTp-a-OZl6kBqRaKo_e0niwC8oFNXFNwJhKOfg";

export const BUCKET = "recordings";

// Verbose logging while we stabilize recording. Flip to false once solid.
export const DEBUG = true;
export const LOG = (...a) => { if (DEBUG) { try { console.log("[Tenet]", ...a); } catch {} } };

// fetch with a hard timeout — no network call may hang the recorder forever.
export async function fetchT(url, opts = {}, ms = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Returns a valid session, refreshing the access_token via the refresh_token
// when it's within 5 min of expiry. Fixes recordings failing with 401 on
// sessions older than ~1h. Falls back to the stored session if it can't refresh.
export async function getFreshSession() {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.access_token) return null;
  const soon = session.expires_at && session.expires_at - Date.now() < 5 * 60 * 1000;
  if (!soon || !session.refresh_token) return session;
  try {
    const res = await fetchT(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }, 12000);
    if (!res.ok) return session;
    const d = await res.json();
    if (!d.access_token) return session;
    const fresh = {
      access_token: d.access_token,
      refresh_token: d.refresh_token || session.refresh_token,
      user: d.user || session.user,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
    };
    await chrome.storage.local.set({ session: fresh });
    LOG("token refreshed");
    return fresh;
  } catch (e) {
    LOG("token refresh failed", e);
    return session;
  }
}
