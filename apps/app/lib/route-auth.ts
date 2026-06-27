import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// CORS so the Chrome extension (a different origin) can call these routes.
// They're token-gated, so a wildcard origin is safe.
export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Resolve the caller's user id from either an extension Bearer token or the web
// app's session cookie. Returns null when unauthenticated.
export async function getUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const res = await fetch(`${URL}/auth/v1/user`, {
        headers: { apikey: KEY, Authorization: auth },
      });
      if (res.ok) return (await res.json())?.id ?? null;
    } catch {}
    return null;
  }
  try {
    const store = await cookies();
    const supabase = createServerClient(URL, KEY, {
      cookies: { getAll: () => store.getAll(), setAll: () => {} },
    });
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
