"use client";

import type { Meeting } from "@/lib/data";
import { Chevron, Doc, Link, Mic, Upload } from "./icons";
import type { SessionAct } from "./TenetApp";

const ACTIONS: { act: SessionAct; icon: React.ReactNode; title: string; sub: string }[] = [
  { act: "live", icon: <Mic />, title: "Record a live meeting", sub: "Tenet listens from your browser — no bot joins." },
  { act: "upload", icon: <Upload />, title: "Upload a recording", sub: "Drop an audio or video file. We transcribe & summarize." },
  { act: "link", icon: <Link />, title: "Paste a meeting link", sub: "Add a Google Meet link — starts when the call begins." },
];

export function HomeView({
  show,
  meetings,
  onAct,
  onOpen,
  name,
}: {
  show: boolean;
  meetings: Meeting[];
  onAct: (act: SessionAct) => void;
  onOpen: (id: string) => void;
  name?: string;
}) {
  const first = (name || "there").trim().split(/\s+/)[0];
  return (
    <div className={`view viewHome${show ? " show" : ""}`}>
      <div className="home">
        <div className="greet">Welcome back, {first}.</div>
        <div className="greet-sub">Start a session, or open a recent one.</div>
        <div className="actions">
          {ACTIONS.map((a) => (
            <button className="acard" key={a.act} onClick={() => onAct(a.act)}>
              <span className="ic">{a.icon}</span>
              <b>{a.title}</b>
              <span>{a.sub}</span>
            </button>
          ))}
        </div>
        <div className="recent-lbl">Recent</div>
        <div>
          {meetings.map((m) => (
            <button className="rcard" key={m.id} onClick={() => onOpen(m.id)}>
              <span className="ric"><Doc /></span>
              <span className="rt">
                <b>{m.title}</b>
                <span>
                  {m.day}, {m.time} · {m.dur}
                </span>
              </span>
              <span className="arr"><Chevron /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
