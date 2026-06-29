"use client";

import { useEffect, useRef, useState } from "react";
import { MEETINGS, fmt, type Meeting, type MeetingSummary, type TranscriptSegment } from "@/lib/data";
import type { AppUser } from "@/lib/types";
import type { RecordResult } from "@/lib/useRecorder";
import { buildReport, buildTranscript, mimeExt, safeName } from "@/lib/report";
import {
  createMeeting,
  deleteMeetingRow,
  listMeetings,
  renameMeetingRow,
  supabaseEnabled,
  updateMeetingContent,
} from "@/lib/meetings";
import { Sidebar } from "./Sidebar";
import { HomeView } from "./HomeView";
import { NoteView } from "./NoteView";
import { LiveView } from "./LiveView";
import { SettingsModal } from "./SettingsModal";
import { ExportIcon, Link, Mic, Upload } from "./icons";

type NoteSeed = {
  audioUrl?: string;
  durSec?: number;
  title?: string;
  blob?: Blob;
  transcript?: TranscriptSegment[];
  summary?: MeetingSummary;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SessionAct = "live" | "upload" | "link";
type View = "home" | "note" | "live";

const MODAL_OPTS: { act: SessionAct; icon: React.ReactNode; title: string; sub: string }[] = [
  { act: "live", icon: <Mic />, title: "Record a live meeting", sub: "Tenet listens from your browser — no bot joins the call." },
  { act: "upload", icon: <Upload />, title: "Upload a recording", sub: "Audio or video file → transcript, summary, sources." },
  { act: "link", icon: <Link />, title: "Paste a meeting link", sub: "Google Meet link — starts when the call begins." },
];

const PROC_STEPS = ["Transcribing audio", "Finding key points", "Linking each point to its source"];
type StepState = "" | "on" | "done";

export function TenetApp({ user }: { user: AppUser }) {
  // Real signed-in user with Supabase configured → persist to the DB.
  // Otherwise (demo user / no Supabase) keep the in-memory showcase dataset.
  const persist = supabaseEnabled && user.id !== "demo";
  const [meetings, setMeetings] = useState<Meeting[]>(persist ? [] : MEETINGS);
  const [view, setView] = useState<View>("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [proc, setProc] = useState<StepState[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const prevView = useRef<View>("home");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMeeting = meetings.find((m) => m.id === activeId) ?? meetings[0];

  // Close the Export menu on any outside click.
  useEffect(() => {
    if (!exportOpen) return;
    const close = () => setExportOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportOpen]);

  // Load the signed-in user's saved sessions from the DB.
  useEffect(() => {
    if (!persist) return;
    let alive = true;
    listMeetings().then((rows) => {
      if (alive) setMeetings(rows);
    });
    return () => {
      alive = false;
    };
  }, [persist]);

  function showToast(t: string) {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  function triggerDownload(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadText(name: string, text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, name);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportReport() {
    setExportOpen(false);
    downloadText(`${safeName(activeMeeting.title)}.md`, buildReport(activeMeeting));
    showToast("Report downloaded.");
  }

  function exportTranscript() {
    setExportOpen(false);
    downloadText(`${safeName(activeMeeting.title)}.txt`, buildTranscript(activeMeeting));
    showToast("Transcript downloaded.");
  }

  function exportAudio() {
    setExportOpen(false);
    if (!activeMeeting.audioUrl) return;
    triggerDownload(activeMeeting.audioUrl, `${safeName(activeMeeting.title)}.${mimeExt(activeMeeting.audioMime)}`);
    showToast("Audio downloaded.");
  }

  function openNote(id: string) {
    setActiveId(id);
    setView("note");
  }

  function renameMeeting(id: string, title: string) {
    const t = title.trim();
    if (!t) return;
    setMeetings((m) => m.map((x) => (x.id === id ? { ...x, title: t } : x)));
    if (persist) void renameMeetingRow(id, t);
  }

  function deleteMeeting(id: string) {
    setMeetings((m) => {
      const target = m.find((x) => x.id === id);
      if (target?.audioUrl?.startsWith("blob:")) URL.revokeObjectURL(target.audioUrl);
      const next = m.filter((x) => x.id !== id);
      return next;
    });
    if (activeId === id) {
      setActiveId(null);
      setView("home");
    }
    if (persist) void deleteMeetingRow(id);
    showToast("Session deleted.");
  }

  function goLive() {
    prevView.current = view === "live" ? prevView.current : view;
    setView("live");
  }

  function endLive() {
    setView(prevView.current);
  }

  function doAct(act: SessionAct) {
    setModalOpen(false);
    if (act === "live") goLive();
    else if (act === "upload") fileRef.current?.click();
    else showToast("Paste-link capture is coming soon — try Upload or Live.");
  }

  // A finished live recording: leave the live view, then process into a note
  // that plays back the real audio and shows the real transcript.
  function finishLive(res: RecordResult) {
    endLive();
    runProcessing({
      audioUrl: res.url,
      durSec: res.durationSec,
      title: "Live session",
      blob: res.blob,
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^./\\]+$/, "");
    const tmp = document.createElement("audio");
    tmp.preload = "metadata";
    tmp.src = url;
    tmp.onloadedmetadata = () => {
      const durSec = Number.isFinite(tmp.duration) ? Math.round(tmp.duration) : undefined;
      runProcessing({ audioUrl: url, durSec, title, blob: file });
    };
    tmp.onerror = () => runProcessing({ audioUrl: url, title, blob: file });
  }

  // Full pipeline: transcribe (Deepgram) → summarize (Gemini), with demo
  // fallbacks at each step. The overlay steps track the real async stages.
  async function runProcessing(seed?: NoteSeed) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setProc(["on", "", ""]);

    // Step 1 — transcribe.
    let transcript: TranscriptSegment[] | undefined;
    try {
      if (seed?.blob) {
        const dur = seed.durSec ?? 30;
        const lang =
          (typeof localStorage !== "undefined" && localStorage.getItem("tenet.recLang")) || "auto";
        const res = await fetch(`/api/transcribe?dur=${dur}&lang=${lang}`, {
          method: "POST",
          headers: { "content-type": seed.blob.type || "audio/webm" },
          body: seed.blob,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.lines) && data.lines.length) transcript = data.lines;
        }
      }
    } catch {
      // transcription failure → note still opens, just without a transcript
    }

    // Step 2 — summarize the transcript.
    let summary: MeetingSummary | undefined;
    if (transcript) {
      setProc(["done", "on", ""]);
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transcript, durSec: seed?.durSec ?? 30 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.summary) summary = data.summary;
        }
      } catch {
        // summary failure → note still opens with the transcript
      }
    }

    if (reduce) {
      setProc(null);
      await finishProcessing({ ...seed, transcript, summary });
      return;
    }

    // Step 3 — link points to sources (visual beat).
    setProc(["done", "done", "on"]);
    await wait(450);
    setProc(null);
    await finishProcessing({ ...seed, transcript, summary });
  }

  async function finishProcessing(seed?: NoteSeed) {
    setProc(null);

    const toast = seed?.summary
      ? "Notes ready — AI recap, key points and transcript."
      : seed?.transcript
      ? "Transcript ready — tap any line to jump to that moment."
      : seed?.blob
      ? "Recording saved, but transcription failed — open it to retry."
      : "Notes ready — every point linked to its source.";

    // Persist to the DB (uploads audio + inserts the row) and use the saved
    // record, which carries a real id and a signed audio URL.
    if (persist) {
      const saved = await createMeeting({
        title: seed?.title || "New session",
        who: "You",
        durSec: seed?.durSec,
        blob: seed?.blob,
        transcript: seed?.transcript,
        summary: seed?.summary,
      });
      if (saved) {
        setMeetings((m) => [saved, ...m]);
        openNote(saved.id);
        showToast(toast);
        return;
      }
      // Save failed — fall back to a local note so the user keeps their work.
    }

    const nm: Meeting = {
      id: "new" + Date.now(),
      day: "Today",
      title: seed?.title || "New session",
      time: "Just now",
      dur: seed?.durSec ? fmt(seed.durSec) : "00:42",
      who: "You",
      audioUrl: seed?.audioUrl,
      durSec: seed?.durSec,
      audioMime: seed?.blob?.type,
      transcript: seed?.transcript,
      summary: seed?.summary,
    };
    setMeetings((m) => [nm, ...m]);
    openNote(nm.id);
    showToast(toast);
  }

  // Re-run transcription + summary for an existing recording (after a failure).
  async function retryTranscription(id: string) {
    const m = meetings.find((x) => x.id === id);
    if (!m?.audioUrl) return;
    let blob: Blob;
    try {
      blob = await fetch(m.audioUrl).then((r) => r.blob());
    } catch {
      showToast("Couldn't read the saved audio.");
      return;
    }

    setProc(["on", "", ""]);
    const dur = m.durSec ?? 30;
    const lang =
      (typeof localStorage !== "undefined" && localStorage.getItem("tenet.recLang")) || "auto";

    let transcript: TranscriptSegment[] | undefined;
    try {
      const res = await fetch(`/api/transcribe?dur=${dur}&lang=${lang}`, {
        method: "POST",
        headers: { "content-type": blob.type || "audio/webm" },
        body: blob,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.lines) && data.lines.length) transcript = data.lines;
      }
    } catch {}

    let summary: MeetingSummary | undefined;
    if (transcript) {
      setProc(["done", "on", ""]);
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transcript, durSec: dur }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.summary) summary = data.summary;
        }
      } catch {}
    }

    setProc(null);
    setMeetings((list) => list.map((x) => (x.id === id ? { ...x, transcript, summary } : x)));
    if (persist && transcript) void updateMeetingContent(id, { transcript, summary });
    showToast(transcript ? "Transcript ready." : "Still couldn't transcribe — check the audio and mic.");
  }

  const ctx = view === "home" ? "Home" : view === "note" ? activeMeeting.title : "Recording";

  return (
    <div className="app">
      <Sidebar
        meetings={meetings}
        activeId={view === "note" ? activeId : null}
        onOpen={openNote}
        onNew={() => setModalOpen(true)}
        onBrand={() => { setActiveId(null); setView("home"); }}
        onProfile={() => setSettingsOpen(true)}
        onRename={renameMeeting}
        onDelete={deleteMeeting}
        user={user}
      />

      <div className="main">
        <div className="topbar">
          <span className="ctx">{ctx}</span>
          <div className="right">
            {view === "note" && activeMeeting && (
              <div className="export-wrap">
                <button
                  className="tb-btn"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setExportOpen((o) => !o)}
                >
                  <ExportIcon /> Export
                </button>
                {exportOpen && (
                  <div className="export-menu" onMouseDown={(e) => e.stopPropagation()}>
                    {activeMeeting.audioUrl && (
                      <button onClick={exportAudio}>Download audio</button>
                    )}
                    <button onClick={exportReport}>Download report (.md)</button>
                    <button onClick={exportTranscript}>Download transcript (.txt)</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="stage">
          <HomeView show={view === "home"} meetings={meetings} onAct={doAct} onOpen={openNote} name={user.name} />
          {activeMeeting && (
            <NoteView
              show={view === "note"}
              meeting={activeMeeting}
              onRename={(title) => renameMeeting(activeMeeting.id, title)}
              onRetry={() => retryTranscription(activeMeeting.id)}
            />
          )}
          <LiveView show={view === "live"} onEnd={endLive} onFinish={finishLive} />
        </div>
      </div>

      {/* new session modal */}
      <div className={`modal${modalOpen ? " show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="sheet">
          <div className="sh-head">
            <h3>New session</h3>
            <button className="x" onClick={() => setModalOpen(false)}>×</button>
          </div>
          {MODAL_OPTS.map((o) => (
            <button className="opt" key={o.act} onClick={() => doAct(o.act)}>
              <span className="ic">{o.icon}</span>
              <span className="ot">
                <b>{o.title}</b>
                <span>{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* processing */}
      <div className={`proc${proc ? " show" : ""}`}>
        <div className="spinner" />
        <div className="ttl">Processing your recording…</div>
        <div className="steps">
          {PROC_STEPS.map((s, i) => (
            <span className={`s ${proc?.[i] ?? ""}`} key={i}>{s}</span>
          ))}
        </div>
      </div>

      {/* toast */}
      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onToast={showToast}
        user={user}
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,video/*"
        hidden
        onChange={onFile}
      />
    </div>
  );
}
