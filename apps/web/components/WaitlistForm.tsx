"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { joinWaitlist, type WaitlistState } from "@/actions/join-waitlist";

const initial: WaitlistState = { ok: false, message: "" };

export function WaitlistForm({
  id,
  note,
}: {
  id?: string;
  note?: string;
}) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);
  const mountedAt = useRef<number>(0);
  const hpId = useId();

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  if (state.ok) {
    return (
      <p className="wl-ok" style={{ display: "block" }} role="status">
        {state.message} &#10022;
      </p>
    );
  }

  return (
    <>
      <form className="waitlist" id={id} action={action} noValidate>
        {/* honeypot, visually hidden */}
        <input
          type="text"
          name="company"
          id={hpId}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            opacity: 0,
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="you@work.com"
          autoComplete="email"
          required
        />
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Joining…" : "Join the waitlist"}
        </button>
      </form>
      {state.message && !state.ok ? (
        <p className="wl-note" role="alert" style={{ color: "var(--amber)" }}>
          {state.message}
        </p>
      ) : note ? (
        <p className="wl-note">{note}</p>
      ) : null}
    </>
  );
}
