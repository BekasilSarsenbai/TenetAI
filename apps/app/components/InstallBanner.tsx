"use client";

import { useEffect, useState } from "react";
import { Puzzle } from "./icons";
import { CHROME_STORE_URL } from "@/lib/links";

const KEY = "tenet-ext-dismissed";

// Bluedot-style nudge: a dismissible strip on Home pointing at the Chrome
// extension (the thing that actually records). Dismissal persists locally.
export function InstallBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="extbar">
      <span className="ico"><Puzzle /></span>
      <span className="tx">Automate your notes and record meetings without a bot — install the Tenet Chrome extension.</span>
      <span className="sp" />
      <a className="go" href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
        <Puzzle /> Install extension
      </a>
      <button className="x" onClick={dismiss} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
