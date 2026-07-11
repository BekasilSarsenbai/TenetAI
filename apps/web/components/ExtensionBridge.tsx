"use client";

import { useEffect } from "react";
import { EXTENSION_ID } from "@/lib/links";
import { createClient } from "@/lib/supabase/client";

type ChromeRuntime = {
  runtime?: {
    sendMessage?: (id: string, msg: unknown, cb?: () => void) => void;
    lastError?: unknown;
  };
};

// Pushes the signed-in Supabase session to the Tenet Chrome extension
// (externally_connectable) so users never sign in twice. Silent no-op when the
// extension isn't installed or the browser isn't Chrome.
export function ExtensionBridge() {
  useEffect(() => {
    const cr = (window as unknown as { chrome?: ChromeRuntime }).chrome;
    if (!cr?.runtime?.sendMessage) return;
    if (!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("https://")) return;
    const sb = createClient();

    const push = async () => {
      const { data } = await sb.auth.getSession();
      const s = data.session;
      if (!s) return;
      try {
        cr.runtime!.sendMessage!(
          EXTENSION_ID,
          {
            type: "TENET_SESSION",
            session: {
              access_token: s.access_token,
              refresh_token: s.refresh_token,
              user: { id: s.user.id, email: s.user.email ?? "" },
              expires_at: (s.expires_at ?? 0) * 1000,
            },
          },
          // reading lastError marks the "no receiver" case as handled
          () => void cr.runtime?.lastError
        );
      } catch {
        /* extension not installed — fine */
      }
    };

    push();
    const { data: sub } = sb.auth.onAuthStateChange(() => void push());
    return () => sub.subscription.unsubscribe();
  }, []);
  return null;
}
