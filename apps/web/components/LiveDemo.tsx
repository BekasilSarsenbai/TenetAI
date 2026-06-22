"use client";

import { useEffect, useRef, useState } from "react";
import { useDict } from "@/lib/i18n";

const fmt = (s: number) =>
  String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

export function LiveDemo() {
  const t = useDict();
  const questions = t.liveDemo.questions;

  const [open, setOpen] = useState(true);
  const [qi, setQi] = useState(1);
  const [clock, setClock] = useState(0);
  const [marks, setMarks] = useState<string[]>([]);
  const [toast, setToast] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-advance the interview question until the visitor takes over.
  useEffect(() => {
    if (interacted || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setQi((i) => (i + 1) % questions.length), 3600);
    return () => clearInterval(id);
  }, [interacted, questions.length]);

  function nextQ() {
    setInteracted(true);
    setQi((i) => Math.min(questions.length - 1, i + 1));
  }

  function addMark() {
    setInteracted(true);
    setMarks((m) => [...m, "★ " + fmt(clock)]);
    setOpen(true);
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 1300);
  }

  return (
    <section className="section" id="trace">
      <div className="wrap">
        <h2>
          {t.liveDemo.h2.a}
          <em>{t.liveDemo.h2.em}</em>
          {t.liveDemo.h2.b}
        </h2>
        <p className="lead">{t.liveDemo.lead}</p>

        <div className="callframe">
          {/* browser window chrome */}
          <div className="winbar">
            <span className="windots"><i className="r" /><i className="y" /><i className="g" /></span>
            <span className="winurl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              meet.google.com/tenet-demo
            </span>
            <span className="winspace" />
          </div>

          <div className="callbody">
            {/* call backdrop */}
            <div className="call">
              <div className="cgrid">
                <figure
                  className="ctile"
                  style={{ backgroundImage: "url(/call/person-1.jpg)" }}
                >
                  <span className="cnm">{t.liveDemo.participantName}</span>
                </figure>
                <figure
                  className="ctile"
                  style={{ backgroundImage: "url(/call/person-2.jpg)" }}
                >
                  <span className="cnm">{t.liveDemo.youName}</span>
                </figure>
              </div>
            </div>

          {/* Google Meet control bar */}
          <div className="cbar" aria-hidden="true">
            <span className="cmeta">2:34 PM&nbsp;&nbsp;·&nbsp;&nbsp;hjk-mnop-qrs</span>
            <span className="cctrls">
              <span className="cbtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </span>
              <span className="cbtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l5-3v10l-5-3zM3 6h12v12H3z" />
                </svg>
              </span>
              <span className="cbtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 11h3M7 14.5h4M14 11h3M14 14.5h3" />
                </svg>
              </span>
              <span className="cbtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4M8 21h8M12 8v5M9.5 10.5L12 8l2.5 2.5" />
                </svg>
              </span>
              <span className="cbtn leave">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10a14 14 0 0 1 18 0l-2.5 2.5a3 3 0 0 1-3.5.5l-1-1a10 10 0 0 0-3 0l-1 1a3 3 0 0 1-3.5-.5z" />
                </svg>
              </span>
            </span>
            <span className="cright">
              <span className="cbtn ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4.5-5.8" />
                </svg>
              </span>
              <span className="cbtn ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.4A8 8 0 1 1 21 11.5z" />
                </svg>
              </span>
            </span>
          </div>

          {/* Tenet assistant — one cohesive card */}
          <div className={`tenet${open ? " open" : ""}`}>
            <div className="tnt-card">
              <div className="thead">
                <span className="td" />
                <span className="tnm">Tenet</span>
                <span className="tdiv">·</span>
                <span className="tclock">{fmt(clock)}</span>
                <span className="tsp" />
                <button className="tmark" onClick={addMark}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3v18l6-5 6 5V3z" />
                  </svg>
                  {t.liveDemo.mark}
                </button>
                <button className="texp" onClick={() => setOpen((o) => !o)} aria-label="Toggle panel">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className="tbody">
                <div className="tbody-in">
                  <div className="tlbl">{t.liveDemo.currentQuestion}</div>
                  <div className="tq">{questions[qi]}</div>
                  <div className="tqmeta">Q{qi + 1} / {questions.length}</div>
                  <div className="trow">
                    <button className="tnextq" onClick={nextQ}>{t.liveDemo.nextQuestion}</button>
                    <button className="tstop">{t.liveDemo.stop}</button>
                  </div>
                  <div className="tmarks">
                    {marks.length === 0 ? (
                      <span className="tempty">{t.liveDemo.marksEmpty}</span>
                    ) : (
                      marks.map((m, i) => (
                        <span className="tm" key={i}>{m}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div className={`ttoast${toast ? " show" : ""}`}>{t.liveDemo.momentMarked}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
