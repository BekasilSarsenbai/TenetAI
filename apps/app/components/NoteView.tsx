"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ASKQA,
  DUR,
  KP,
  type Meeting,
  type QA,
  TLDR,
  TODOS,
  TR,
  fmt,
} from "@/lib/data";
import { Chevron, Mag, PauseIcon, PlayTri, SendIcon } from "./icons";

const NB = 64;
const reduce = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Deterministic waveform bar heights (seeded, matches the prototype curve).
const BAR_HEIGHTS = Array.from({ length: NB }, (_, i) => {
  const env = Math.sin((i / NB) * Math.PI);
  return Math.round((0.24 + Math.abs(Math.sin(i * 12.9)) * 0.55 * (0.5 + 0.6 * env)) * 100);
});

type Thread = { q: string; a: string; cites: QA["cites"] }[];

export function NoteView({
  show,
  meeting,
  onRename,
  onRetry,
}: {
  show: boolean;
  meeting: Meeting;
  onRename?: (title: string) => void;
  onRetry?: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [openKp, setOpenKp] = useState<number | null>(null);
  const [trOpen, setTrOpen] = useState(false);
  const [litSrc, setLitSrc] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerOn, setPlayerOn] = useState(false);
  const [thread, setThread] = useState<Thread>([]);
  const [draft, setDraft] = useState("");
  const [audioDur, setAudioDur] = useState<number | null>(null);
  const fixingDur = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasAudio = !!meeting.audioUrl;
  const DURATION = audioDur ?? meeting.durSec ?? DUR;
  const realTr = meeting.transcript;
  const hasTranscript = !!realTr?.length;
  const summary = meeting.summary;
  const hasSummary = !!summary;
  // A real recording/upload (has audio) that produced no transcript/summary.
  const failed = hasAudio && !hasTranscript && !hasSummary;
  // Demo seed meetings (m1–m5) have no audio — they show the showcase content.
  const isDemoNote = !hasAudio;

  // Index of the transcript line currently being spoken (for live highlight).
  const activeLine = useMemo(() => {
    if (!realTr?.length) return -1;
    let idx = -1;
    for (let i = 0; i < realTr.length; i++) {
      if (cur >= realTr[i].start) idx = i;
      else break;
    }
    return idx;
  }, [realTr, cur]);

  // Reset the whole note when a different meeting is opened.
  useEffect(() => {
    setEditingTitle(false);
    setOpenKp(null);
    setTrOpen(!!meeting.transcript?.length);
    setLitSrc(null);
    setCur(0);
    setPlaying(false);
    setPlayerOn(!!meeting.audioUrl);
    setThread([]);
    setDraft("");
    setAudioDur(null);
    fixingDur.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [meeting.id, meeting.audioUrl, meeting.transcript]);

  // Synthetic playback clock — only for demo notes without real audio.
  useEffect(() => {
    if (hasAudio || !playing || reduce()) return;
    const t = setInterval(() => {
      setCur((c) => {
        if (c + 0.5 >= DURATION) {
          setPlaying(false);
          return DURATION;
        }
        return c + 0.5;
      });
    }, 250);
    return () => clearInterval(t);
  }, [playing, hasAudio, DURATION]);

  // Real audio: mirror the <audio> element's clock, play state, and recover the
  // real duration for MediaRecorder webm blobs (which report Infinity at first).
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasAudio) return;
    const onTime = () => {
      if (fixingDur.current) return;
      setCur(a.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onMeta = () => {
      if (isFinite(a.duration) && a.duration > 0) setAudioDur(a.duration);
      else {
        fixingDur.current = true;
        try { a.currentTime = 1e101; } catch {}
      }
    };
    const onDur = () => {
      if (isFinite(a.duration) && a.duration > 0) {
        setAudioDur(a.duration);
        if (fixingDur.current) {
          fixingDur.current = false;
          try { a.currentTime = 0; } catch {}
          setCur(0);
        }
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onDur);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onDur);
    };
  }, [hasAudio, meeting.id]);

  // Scroll the highlighted demo transcript line into view when a source opens.
  useEffect(() => {
    if (litSrc == null || !trOpen) return;
    const line = transcriptRef.current?.querySelector<HTMLElement>(`.tl[data-src="${litSrc}"]`);
    if (line) {
      const id = setTimeout(() => line.scrollIntoView({ block: "center", behavior: reduce() ? "auto" : "smooth" }), 80);
      return () => clearTimeout(id);
    }
  }, [litSrc, trOpen]);

  function seekTo(sec: number) {
    const target = Math.min(DURATION, Math.max(0, sec));
    setCur(target);
    if (hasAudio && audioRef.current) audioRef.current.currentTime = target;
    return target;
  }

  function togglePlay() {
    if (hasAudio) {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    } else {
      setPlaying((p) => !p);
    }
  }

  function gotoTime(sec: number) {
    setPlayerOn(true);
    seekTo(sec);
    if (hasAudio) audioRef.current?.play().catch(() => {});
    else setPlaying(true);
  }

  function gotoSource(sec: number, src: number) {
    setTrOpen(true);
    setLitSrc(src);
    gotoTime(sec);
  }

  function toggleKp(i: number, sec: number, src?: number) {
    if (openKp === i) {
      setOpenKp(null);
    } else {
      setOpenKp(i);
      if (src != null) gotoSource(sec, src);
      else gotoTime(sec);
    }
  }

  function answer(item: QA, qText: string) {
    setThread((t) => [...t, { q: qText, a: item.a, cites: item.cites }]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce() ? "auto" : "smooth" });
    }, 60);
  }

  function sendAsk() {
    const v = draft.trim();
    if (!v) return;
    setDraft("");
    const lv = v.toLowerCase();
    const match =
      ASKQA.find((x) => lv.includes("price") && x.q.includes("pricing")) ||
      ASKQA.find((x) => (lv.includes("block") || lv.includes("stuck")) && x.q.includes("block")) ||
      ASKQA.find((x) => lv.includes("trust") && x.q.includes("trust"));
    const item: QA = match ?? {
      q: v,
      a: "I can only answer from this meeting. Try asking about the empty state, examples, or what built trust.",
      cites: null,
    };
    answer(item, v);
  }

  const idx = Math.round((cur / DURATION) * NB);

  return (
    <div className={`view viewNote${show ? " show" : ""}`}>
      <div className="scroll" ref={scrollRef}>
        <div className="col">
          {editingTitle ? (
            <input
              className="doc-title-edit"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onRename?.(titleDraft); setEditingTitle(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
            />
          ) : (
            <div
              className={`doc-title${onRename ? " editable" : ""}`}
              onClick={() => { if (onRename) { setTitleDraft(meeting.title); setEditingTitle(true); } }}
              title={onRename ? "Click to rename" : undefined}
            >
              {meeting.title}
              {onRename && <span className="title-pen">✎</span>}
            </div>
          )}
          <div className="doc-meta">
            <span>{meeting.day}, {meeting.time}</span>
            <span className="dot" />
            <span>{meeting.dur}</span>
            <span className="dot" />
            <span>{meeting.who}</span>
          </div>

          {failed ? (
            <div className="fail-note">
              <p className="lead" style={{ marginTop: 22 }}>
                <span className="lbl">Audio</span>
                <span>
                  Your recording is saved, but we couldn&apos;t pull a transcript from it — the audio
                  may have been silent, very short, or the mic didn&apos;t capture sound. Play it back
                  below to check, or try again.
                </span>
              </p>
              {onRetry && (
                <button className="retry-btn" onClick={onRetry}>↻ Try transcribing again</button>
              )}
            </div>
          ) : (
            <>
              {/* TL;DR — real AI summary, transcript notice, or demo */}
              <p className="lead">
                <span className="lbl">{hasTranscript && !hasSummary ? "Transcript" : "TL;DR"}</span>
                <span>{hasSummary ? summary!.tldr : hasTranscript ? transcriptNotice(meeting) : TLDR}</span>
              </p>

              {/* Key points */}
              {hasSummary
                ? summary!.keyPoints.length > 0 && (
                    <>
                      <div className="sec">Key points</div>
                      <div>
                        {summary!.keyPoints.map((k, i) => (
                          <div className={`kpw${openKp === i ? " open" : ""}`} key={i}>
                            <button className="kp" onClick={() => toggleKp(i, k.start)}>
                              <span className="dot" />
                              <span className="body">
                                <span className="txt">{k.text}</span>
                                <br />
                                <span className="ts"><span className="pp">▶</span>{fmt(k.start)} · {k.speaker}</span>
                              </span>
                              <span className="src-ico" title="See source"><Mag /></span>
                            </button>
                            <div className="kp-src">
                              <p className="q">&quot;{k.quote}&quot;</p>
                              <div className="m">
                                <span>▶ Jump to {fmt(k.start)}</span>
                                <span className="who">· {k.speaker}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                : isDemoNote && (
                    <>
                      <div className="sec">Key points</div>
                      <div>
                        {KP.map((k, i) => (
                          <div className={`kpw${openKp === i ? " open" : ""}`} key={i}>
                            <button className="kp" onClick={() => toggleKp(i, k.sec, i)}>
                              <span className="dot" />
                              <span className="body">
                                <span className="txt">{k.txt}</span>
                                <br />
                                <span className="ts"><span className="pp">▶</span>{k.ts} · {k.who}</span>
                              </span>
                              <span className="src-ico" title="See source"><Mag /></span>
                            </button>
                            <div className="kp-src">
                              <p className="q">&quot;{k.q}&quot;</p>
                              <div className="m">
                                <span>▶ Jump to {k.ts}</span>
                                <span className="who">· {k.who}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

              {/* Next steps */}
              {hasSummary
                ? summary!.nextSteps.length > 0 && (
                    <>
                      <div className="sec">Next steps</div>
                      {summary!.nextSteps.map((t, i) => (
                        <div className="todo" key={i}>
                          <span className="cb" /> {t}
                        </div>
                      ))}
                    </>
                  )
                : isDemoNote && (
                    <>
                      <div className="sec">Next steps</div>
                      {TODOS.map((t, i) => (
                        <div className="todo" key={i}>
                          <span className="cb" /> {t}
                        </div>
                      ))}
                    </>
                  )}

              {/* Transcript */}
              {hasTranscript ? (
                <>
                  <div className="sec" style={{ marginTop: 26 }}>Full transcript</div>
                  <div className="transcript open transcript-real" ref={transcriptRef}>
                    {realTr!.map((l, i) => (
                      <button
                        key={i}
                        className={`tl tl-real${i === activeLine ? " lit" : ""}`}
                        onClick={() => gotoTime(l.start)}
                      >
                        <span className="who">{l.speaker}</span>
                        <span className="said">
                          <span className="tl-ts">{fmt(l.start)}</span>
                          {l.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                isDemoNote && (
                  <>
                    <button className={`tr-toggle${trOpen ? " open" : ""}`} onClick={() => setTrOpen((o) => !o)}>
                      <Chevron />
                      <span> {trOpen ? "Hide transcript" : "Show full transcript"}</span>
                    </button>
                    <div className={`transcript${trOpen ? " open" : ""}`} ref={transcriptRef}>
                      {TR.map((t, i) => (
                        <div
                          key={i}
                          className={`tl${t.src != null && t.src === litSrc ? " lit" : ""}`}
                          data-src={t.src ?? undefined}
                        >
                          <span className="who">{t.who}</span>
                          <span className="said" dangerouslySetInnerHTML={{ __html: t.said }} />
                        </div>
                      ))}
                    </div>

                    <div className="askwrap">
                      <div className="sec">Ask — with receipts</div>
                      <div className="sugg">
                        {ASKQA.map((x, i) => (
                          <button key={i} onClick={() => answer(x, x.q)}>{x.q}</button>
                        ))}
                      </div>
                      <div>
                        {thread.map((item, i) => (
                          <div className="qa" key={i}>
                            <div className="bub u">{item.q}</div>
                            <div className="bub a">
                              {item.a}
                              <div className="cites">
                                {item.cites ? (
                                  item.cites.map((c, j) => (
                                    <button className="cite" key={j} onClick={() => gotoSource(c.sec, c.src)}>
                                      ▶ {c.who} · {c.ts}
                                    </button>
                                  ))
                                ) : (
                                  <span className="cite none">no source — not in this meeting</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>

      {hasAudio && <audio ref={audioRef} src={meeting.audioUrl} preload="auto" />}

      <div className="askbar-wrap">
        <div className={`player${playerOn ? " show" : ""}`}>
          <button className="play" onClick={togglePlay}>
            {playing ? <PauseIcon /> : <PlayTri />}
          </button>
          <div
            className="wave"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - r.left) / r.width) * DURATION);
            }}
          >
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={`b${i <= idx ? " played" : ""}${i >= idx - 1 && i <= idx + 2 ? " act" : ""}`}
                style={{ height: h + "%" }}
              />
            ))}
            <div className="ph" style={{ left: (cur / DURATION) * 100 + "%" }} />
          </div>
          <span className="ptime"><b>{fmt(cur)}</b> / {fmt(DURATION)}</span>
          <button className="pclose" onClick={() => { audioRef.current?.pause(); setPlaying(false); setPlayerOn(false); }}>×</button>
        </div>
        <div className="askbar">
          <input
            placeholder={isDemoNote ? "Ask anything about this meeting…" : "Ask anything — AI answers land in the next step…"}
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendAsk(); }}
            disabled={!isDemoNote}
          />
          <button className="send" onClick={sendAsk} disabled={!isDemoNote}><SendIcon /></button>
        </div>
      </div>
    </div>
  );
}

function transcriptNotice(meeting: Meeting): string {
  const tr = meeting.transcript ?? [];
  const speakers = new Set(tr.map((l) => l.speaker)).size;
  const words = tr.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
  const dur = fmt(meeting.durSec ?? 0);
  return `Auto-transcribed from your recording — ${speakers} speaker${speakers > 1 ? "s" : ""}, ${words} words across ${dur}.`;
}
