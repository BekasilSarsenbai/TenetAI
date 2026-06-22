"use client";

import { useState } from "react";
import { useDict } from "@/lib/i18n";

const MagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

// Fixed timestamps per key point; text/quote/speaker are localized.
const KP_TS = ["12:04", "04:12", "21:37"];

export function GranolaMock() {
  const t = useDict();
  const g = t.granola;
  const [open, setOpen] = useState(0);

  return (
    <div className="gmock">
      <div className="gst">
        <div className="gwin">
          <div className="tbar">
            <div className="dots">
              <i className="r" />
              <i className="y" />
              <i className="g" />
            </div>
            <span className="tname">Tenet</span>
            <span className="rec">
              <span className="rd" />
              {g.recording}
            </span>
          </div>
          <div className="grid">
            <aside className="side">
              <div className="snew">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>{" "}
                {g.newNote}
              </div>
              <div className="ssearch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                </svg>{" "}
                {g.search}
              </div>
              <div className="sgrp">{g.today}</div>
              <button className="sitem on">
                {g.sidebar[0].name}
                <span className="d">{g.sidebar[0].when}</span>
              </button>
              <button className="sitem">
                {g.sidebar[1].name}
                <span className="d">{g.sidebar[1].when}</span>
              </button>
              <div className="sgrp">{g.yesterday}</div>
              <button className="sitem">
                {g.sidebar[2].name}
                <span className="d">{g.sidebar[2].when}</span>
              </button>
              <button className="sitem">
                {g.sidebar[3].name}
                <span className="d">{g.sidebar[3].when}</span>
              </button>
              <button className="sitem">
                {g.sidebar[4].name}
                <span className="d">{g.sidebar[4].when}</span>
              </button>
            </aside>
            <div className="doc">
              <div className="dtitle">{g.docTitle}</div>
              <div className="dmeta">
                <span>{g.date}</span>
                <span className="dot" />
                <span>27:14</span>
                <span className="dot" />
                <span className="who">{g.attendees}</span>
              </div>
              <div className="drule" />
              <div className="sec">{g.summary}</div>
              <p className="para">
                {g.para.a}
                <b>{g.para.b}</b>
                {g.para.c}
              </p>
              <div className="sec">{g.keyPoints}</div>
              <div>
                {g.kp.map((k, i) => (
                  <div className={`kpwrap${open === i ? " on" : ""}`} key={KP_TS[i]}>
                    <div className="kp">
                      <span className="bd" />
                      <span className="kt">{k.t}</span>
                      <button
                        className="mag"
                        title={g.seeSource}
                        aria-label={g.seeSource}
                        onClick={() => setOpen(open === i ? -1 : i)}
                      >
                        <MagIcon />
                      </button>
                    </div>
                    <div className="src">
                      <p className="q">&quot;{k.q}&quot;</p>
                      <div className="sm">
                        <span className="pp">&#9654;</span> {g.jumpTo} {KP_TS[i]}{" "}
                        <span className="who">· {g.speaker}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sec">{g.nextSteps}</div>
              <div className="todo">
                <span className="cb" /> {g.todos[0]}
              </div>
              <div className="todo">
                <span className="cb" /> {g.todos[1]}
              </div>
              <div className="ask">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                </svg>
                <span className="ph">{g.ask}</span>
                <span className="kbd">⌘J</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
