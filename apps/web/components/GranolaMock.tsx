"use client";

import { useState } from "react";

const KP = [
  {
    t: "Onboarding is where most new users quietly drop off.",
    q: "most of the drop-off happens during onboarding, before they ever reach the core feature.",
    ts: "12:04",
    who: "Dev",
  },
  {
    t: "The team keeps re-doing context between weekly syncs.",
    q: "we keep losing context between the weekly syncs, so we redo the same conversation.",
    ts: "04:12",
    who: "Dev",
  },
  {
    t: "Pricing felt fair the moment they saw the time saved.",
    q: "once I saw how much time it saved, it felt completely fair.",
    ts: "21:37",
    who: "Dev",
  },
];

const MagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

export function GranolaMock() {
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
              Recording · 27:14
            </span>
          </div>
          <div className="grid">
            <aside className="side">
              <div className="snew">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>{" "}
                New note
              </div>
              <div className="ssearch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                </svg>{" "}
                Search
              </div>
              <div className="sgrp">Today</div>
              <button className="sitem on">
                Discovery call, Acme × Northwind
                <span className="d">10:30 AM · live</span>
              </button>
              <button className="sitem">
                Weekly sync, Growth<span className="d">9:00 AM</span>
              </button>
              <div className="sgrp">Yesterday</div>
              <button className="sitem">
                Roadmap review<span className="d">4:15 PM</span>
              </button>
              <button className="sitem">
                1:1 with Priya<span className="d">1:00 PM</span>
              </button>
              <button className="sitem">
                Customer, Lumen Labs<span className="d">11:00 AM</span>
              </button>
            </aside>
            <div className="doc">
              <div className="dtitle">Discovery call, Acme × Northwind</div>
              <div className="dmeta">
                <span>Jun 11</span>
                <span className="dot" />
                <span>27:14</span>
                <span className="dot" />
                <span className="who">Maya, Dev, Priya</span>
              </div>
              <div className="drule" />
              <div className="sec">Summary</div>
              <p className="para">
                Acme&apos;s activation is leaking at <b>onboarding</b>. The team keeps re-doing context between weekly
                syncs, and pricing felt fair once the time saved was clear.
              </p>
              <div className="sec">Key points</div>
              <div>
                {KP.map((k, i) => (
                  <div className={`kpwrap${open === i ? " on" : ""}`} key={k.ts}>
                    <div className="kp">
                      <span className="bd" />
                      <span className="kt">{k.t}</span>
                      <button
                        className="mag"
                        title="See source"
                        aria-label="See source"
                        onClick={() => setOpen(open === i ? -1 : i)}
                      >
                        <MagIcon />
                      </button>
                    </div>
                    <div className="src">
                      <p className="q">&quot;{k.q}&quot;</p>
                      <div className="sm">
                        <span className="pp">&#9654;</span> Jump to {k.ts}{" "}
                        <span className="who">· {k.who}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sec">Next steps</div>
              <div className="todo">
                <span className="cb" /> Audit onboarding funnel drop-off
              </div>
              <div className="todo">
                <span className="cb" /> Share weekly-sync recap template
              </div>
              <div className="ask">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                </svg>
                <span className="ph">Ask anything about this meeting…</span>
                <span className="kbd">⌘J</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
