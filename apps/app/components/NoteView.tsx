"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ASKQA,
  DUR,
  INSIGHTS,
  KP,
  type Meeting,
  type QA,
  TLDR,
  TODOS,
  TR,
  type TranscriptSegment,
  fmt,
} from "@/lib/data";
import { Mag, PauseIcon, PlayTri, SendIcon } from "./icons";

const reduce = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Static waveform shape for the audio player (bars fill amber as playback advances).
const WAVE = [
  34, 52, 40, 66, 48, 72, 58, 80, 62, 90, 70, 84, 60, 74, 50, 64, 44, 58, 68, 88, 76, 92,
  70, 80, 58, 66, 48, 60, 42, 54, 64, 78, 86, 72, 60, 50, 44, 56, 66, 52, 72, 46, 62, 50,
];

type Tab = "transcript" | "insights" | "chat";
type Thread = { q: string; a: string; cites?: QA["cites"] }[];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Russian plural for "реплика" (contributions).
function plural(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "реплика";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "реплики";
  return "реплик";
}

function speakerStats(tr: TranscriptSegment[]): string[] {
  const counts = new Map<string, number>();
  for (const l of tr) counts.set(l.speaker, (counts.get(l.speaker) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `<b>${escapeHtml(name)}</b> — ${n} ${plural(n)}`);
}

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
  const [litSrc, setLitSrc] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<Tab>("transcript");
  const [thread, setThread] = useState<Thread>([]);
  const [draft, setDraft] = useState("");
  const [audioDur, setAudioDur] = useState<number | null>(null);
  const fixingDur = useRef(false);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
  const pct = Math.min(100, (cur / DURATION) * 100);

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

  // Insights tab content — derived from real data, or the demo showcase.
  const insThemes = hasSummary
    ? summary!.keyPoints.map((k) => escapeHtml(k.text))
    : isDemoNote
    ? INSIGHTS.themes
    : [];
  const insSpeakers = hasTranscript
    ? speakerStats(realTr!)
    : isDemoNote
    ? INSIGHTS.speakers
    : [];

  // Reset the whole note when a different meeting is opened.
  useEffect(() => {
    setEditingTitle(false);
    setOpenKp(null);
    setLitSrc(null);
    setCur(0);
    setPlaying(false);
    setTab("transcript");
    setThread([]);
    setDraft("");
    setAudioDur(null);
    fixingDur.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (leftScrollRef.current) leftScrollRef.current.scrollTop = 0;
    if (panelRef.current) panelRef.current.scrollTop = 0;
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

  // When a source lights up, scroll the highlighted transcript line into view.
  useEffect(() => {
    if (tab !== "transcript") return;
    const el = panelRef.current?.querySelector<HTMLElement>(".tr-block.lit");
    if (el) {
      const id = setTimeout(
        () => el.scrollIntoView({ block: "center", behavior: reduce() ? "auto" : "smooth" }),
        80
      );
      return () => clearTimeout(id);
    }
  }, [tab, litSrc, activeLine]);

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

  function seekBar(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - r.left) / r.width) * DURATION);
  }

  function gotoTime(sec: number) {
    seekTo(sec);
    if (hasAudio) audioRef.current?.play().catch(() => {});
    else setPlaying(true);
  }

  function gotoSource(sec: number, src?: number) {
    setTab("transcript");
    if (src != null) setLitSrc(src);
    gotoTime(sec);
  }

  function toggleKp(i: number, sec: number, src?: number) {
    if (openKp === i) {
      setOpenKp(null);
    } else {
      setOpenKp(i);
      gotoSource(sec, src);
    }
  }

  function scrollPanelDown() {
    setTimeout(() => {
      panelRef.current?.scrollTo({
        top: panelRef.current.scrollHeight,
        behavior: reduce() ? "auto" : "smooth",
      });
    }, 60);
  }

  function answer(item: QA, qText: string) {
    setThread((t) => [...t, { q: qText, a: item.a, cites: item.cites }]);
    setTab("chat");
    scrollPanelDown();
  }

  function sendAsk() {
    const v = draft.trim();
    if (!v) return;
    setDraft("");
    setTab("chat");
    if (isDemoNote) {
      const lv = v.toLowerCase();
      const match = ASKQA.find((x) => {
        const q = x.q.toLowerCase();
        if ((lv.includes("цен") || lv.includes("price")) && q.includes("цен")) return true;
        if ((lv.includes("меша") || lv.includes("блок") || lv.includes("проблем")) && q.includes("меша")) return true;
        if (lv.includes("конкур") && q.includes("конкур")) return true;
        return false;
      });
      const item: QA =
        match ?? {
          q: v,
          a: "Я отвечаю только по этой встрече. Спросите про онбординг, контекст между синками или цену.",
          cites: null,
        };
      answer(item, v);
    } else {
      setThread((t) => [
        ...t,
        {
          q: v,
          a: "Живой AI-чат скоро появится — ответы со ссылками на тайм-коды прямо из вашего транскрипта. Пока что откройте «Key points» или вкладку Transcript, чтобы перейти к нужному моменту.",
        },
      ]);
      scrollPanelDown();
    }
  }

  // ---- key points (real summary or demo showcase) ----
  const keyPoints: { text: string; ts: string; sec: number; who: string; quote: string; src?: number }[] =
    hasSummary
      ? summary!.keyPoints.map((k) => ({ text: k.text, ts: fmt(k.start), sec: k.start, who: k.speaker, quote: k.quote }))
      : isDemoNote
      ? KP.map((k, i) => ({ text: k.txt, ts: k.ts, sec: k.sec, who: k.who, quote: k.q, src: i }))
      : [];
  const nextSteps = hasSummary ? summary!.nextSteps : isDemoNote ? TODOS : [];

  return (
    <div className={`view viewNote${show ? " show" : ""}`}>
      <div className="vnote">
        {/* ---------------- left: document ---------------- */}
        <div className="note-left">
          <div className="note-left-scroll" ref={leftScrollRef}>
            <div className="nl-inner">
              {/* media tile — audio player (Tenet records audio only, no video) */}
              <div className="aud">
                <div className="aud-top">
                  <span className="rd" />
                  <span className="aud-lbl">Аудио запись</span>
                </div>
                <div className="aud-row">
                  <button className="aud-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <PauseIcon /> : <PlayTri />}
                  </button>
                  <div className="aud-wave" onClick={seekBar} role="slider"
                    aria-label="Перемотка записи" aria-valuemin={0} aria-valuemax={Math.round(DURATION)} aria-valuenow={Math.round(cur)}>
                    {WAVE.map((h, i) => (
                      <i key={i} className={((i + 0.5) / WAVE.length) * 100 <= pct ? "on" : undefined} style={{ height: h + "%" }} />
                    ))}
                  </div>
                  <span className="aud-t">{fmt(cur)} / {fmt(DURATION)}</span>
                </div>
              </div>

              {/* title */}
              {editingTitle ? (
                <input
                  className="nl-title-edit"
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
                  className={`nl-title${onRename ? " editable" : ""}`}
                  onClick={() => { if (onRename) { setTitleDraft(meeting.title); setEditingTitle(true); } }}
                  title={onRename ? "Click to rename" : undefined}
                >
                  {meeting.title}
                  {onRename && <span className="pen">✎</span>}
                </div>
              )}

              <div className="nl-meta">
                <span>{meeting.day}, {meeting.time}</span>
                <span className="sep" />
                <span>{meeting.dur}</span>
                <span className="sep" />
                <span>{meeting.who}</span>
              </div>

              <div className="nl-rule" />

              {failed ? (
                <div className="fail">
                  <div className="sec-h" style={{ marginTop: 0 }}>Recording saved</div>
                  <p>
                    <span className="lbl">Audio</span>
                    We couldn&apos;t pull a transcript from this recording — it may have been silent,
                    very short, or the mic didn&apos;t capture sound. Play it back above to check, or try again.
                  </p>
                  {onRetry && <button className="retry-btn" onClick={onRetry}>↻ Try transcribing again</button>}
                </div>
              ) : (
                <>
                  <div className="sec-h" style={{ marginTop: 0 }}>Summary</div>
                  {hasSummary ? (
                    <p className="summary-p">{summary!.tldr}</p>
                  ) : hasTranscript ? (
                    <p className="summary-p">{transcriptNotice(meeting)}</p>
                  ) : (
                    <p className="summary-p" dangerouslySetInnerHTML={{ __html: TLDR }} />
                  )}

                  {keyPoints.length > 0 && (
                    <>
                      <div className="sec-h">Key points</div>
                      <div>
                        {keyPoints.map((k, i) => (
                          <div className={`kp${openKp === i ? " open" : ""}`} key={i}>
                            <button className="kp-row" onClick={() => toggleKp(i, k.sec, k.src)}>
                              <span className="kp-dot" />
                              <span className="kp-main">
                                <span className="kp-txt">{k.text}</span>
                                <span className="kp-ts"><span className="pp">▶</span>{k.ts} · {k.who}</span>
                              </span>
                              <span className="kp-mag" title="See source"><Mag /></span>
                            </button>
                            <div className="kp-src">
                              <div className="kp-quote">&quot;{k.quote}&quot;</div>
                              <div className="kp-jump">
                                <span className="pp"><PlayTri /></span>
                                Jump to {k.ts}<span className="who"> · {k.who}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {nextSteps.length > 0 && (
                    <>
                      <div className="sec-h">Next steps</div>
                      {nextSteps.map((t, i) => (
                        <div className="todo" key={i}><span className="cb" /> {t}</div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- right: tabbed panel ---------------- */}
        <div className="note-right">
          <div className="tabs">
            <button className={`tab${tab === "transcript" ? " on" : ""}`} onClick={() => setTab("transcript")}>Transcript</button>
            <button className={`tab${tab === "insights" ? " on" : ""}`} onClick={() => setTab("insights")}>Insights</button>
            <button className={`tab${tab === "chat" ? " on" : ""}`} onClick={() => setTab("chat")}>AI chat</button>
          </div>

          <div className="panel" ref={panelRef}>
            {tab === "transcript" && (
              hasTranscript ? (
                realTr!.map((l, i) => {
                  // Group consecutive lines from the same speaker: only the first
                  // of a run shows the avatar + name + timestamp header.
                  const showWho = i === 0 || realTr![i - 1].speaker !== l.speaker;
                  // Highlight the spoken line only once playback has actually moved
                  // (avoids line 0 looking "selected" at cur=0 on load).
                  const lit = i === activeLine && cur > 0;
                  return (
                    <button
                      key={i}
                      className={`tr-block clickable${lit ? " lit" : ""}${showWho ? "" : " cont"}`}
                      onClick={() => gotoTime(l.start)}
                    >
                      {showWho && (
                        <div className="tr-who">
                          <span className="tr-av">{l.speaker[0]?.toUpperCase()}</span>
                          <span className="tr-name">{l.speaker}</span>
                          <span className="tr-ts">{fmt(l.start)}</span>
                        </div>
                      )}
                      <div className="tr-said">{l.text}</div>
                    </button>
                  );
                })
              ) : isDemoNote ? (
                TR.map((t, i) => (
                  <div
                    key={i}
                    className={`tr-block${t.src != null && t.src === litSrc ? " lit" : ""}`}
                    data-src={t.src ?? undefined}
                  >
                    <div className="tr-who">
                      <span className="tr-av">{t.who[0]?.toUpperCase()}</span>
                      <span className="tr-name">{t.who}</span>
                    </div>
                    <div className="tr-said" dangerouslySetInnerHTML={{ __html: t.said }} />
                  </div>
                ))
              ) : (
                <div className="panel-empty">Transcript will appear here once your recording is transcribed.</div>
              )
            )}

            {tab === "insights" && (
              insThemes.length > 0 || insSpeakers.length > 0 ? (
                <>
                  {insThemes.length > 0 && (
                    <div className="ins-block">
                      <div className="ins-lbl">Themes</div>
                      {insThemes.map((th, i) => (
                        <div className="ins-item" key={i}>
                          <span className="ins-dot" />
                          <span className="ins-txt" dangerouslySetInnerHTML={{ __html: th }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {insSpeakers.length > 0 && (
                    <div className="ins-block">
                      <div className="ins-lbl">Speakers</div>
                      {insSpeakers.map((sp, i) => (
                        <div className="ins-item" key={i}>
                          <span className="ins-dot" />
                          <span className="ins-txt" dangerouslySetInnerHTML={{ __html: sp }} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="panel-empty">Insights appear once this meeting is transcribed and summarized.</div>
              )
            )}

            {tab === "chat" && (
              <>
                {isDemoNote && thread.length === 0 && (
                  <div className="sugg">
                    {ASKQA.map((x, i) => (
                      <button key={i} onClick={() => answer(x, x.q)}>{x.q}</button>
                    ))}
                  </div>
                )}
                {thread.map((item, i) => (
                  <div className="chat-row" key={i}>
                    <div className="chat-q"><div className="bub u">{item.q}</div></div>
                    <div className="bub a">
                      {item.a}
                      {item.cites !== undefined && (
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
                      )}
                    </div>
                  </div>
                ))}
                {!isDemoNote && thread.length === 0 && (
                  <div className="panel-empty">
                    Ask anything about this meeting — grounded, timestamped answers are coming.
                    For now, jump to any moment from Key points or the Transcript.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---------------- floating dock ---------------- */}
        <div className="dock">
          <div className="dock-inner">
            <button className="dock-resume" onClick={togglePlay}>
              {playing ? <PauseIcon /> : <PlayTri />}
              {playing ? "Pause" : "Listen"}
              <span className="t">{fmt(cur)}</span>
            </button>
            <div className="dock-ask">
              <input
                placeholder="Ask anything about this meeting…"
                autoComplete="off"
                value={draft}
                onFocus={() => setTab("chat")}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendAsk(); }}
              />
              <button className="dock-send" onClick={sendAsk} disabled={!draft.trim()}><SendIcon /></button>
            </div>
          </div>
        </div>

        {hasAudio && <audio ref={audioRef} src={meeting.audioUrl} preload="auto" />}
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
