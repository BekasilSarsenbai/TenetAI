"use client";

import { useEffect, useRef, useState } from "react";
import { GUIDE, fmt } from "@/lib/data";
import { Flag } from "./icons";
import { useRecorder, type RecordResult } from "@/lib/useRecorder";

export function LiveView({
  show,
  onEnd,
  onFinish,
}: {
  show: boolean;
  onEnd: () => void;
  onFinish: (res: RecordResult) => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [markers, setMarkers] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  const curQRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, seconds, start, stop, reset } = useRecorder(canvasRef);

  // Start the mic when the live view appears; tear it down when it leaves
  // (e.g. navigating Home discards the take without creating a note).
  useEffect(() => {
    if (!show) return;
    setQIdx(0);
    setMarkers([]);
    setEnding(false);
    start();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Keep the current question centered as it changes.
  useEffect(() => {
    if (!show) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    curQRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [qIdx, show]);

  const setQ = (i: number) => setQIdx(Math.max(0, Math.min(GUIDE.length - 1, i)));
  const addMark = () => setMarkers((m) => [...m, "★ " + fmt(seconds)]);

  async function endSession() {
    if (ending) return;
    setEnding(true);
    const res = await stop();
    if (res && res.durationSec >= 1) onFinish(res);
    else onEnd();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const denied = status === "denied" || status === "error";
  const recLabel =
    status === "requesting" ? "Starting…" : denied ? "Mic off" : "Recording";

  return (
    <div className={`view liveView${show ? " show" : ""}`}>
      <div className="live-bar">
        <span className={`rec${denied ? " muted" : ""}`}>
          <span className="rd" />
          {recLabel}
        </span>
        <span className="clock">{mm}:{ss}</span>
        {denied ? (
          <span className="mic-warn">Mic access blocked — the guide still works</span>
        ) : (
          <canvas className="live-wave" ref={canvasRef} />
        )}
        <button className="end" onClick={endSession} disabled={ending}>
          {ending ? "Saving…" : "End session"}
        </button>
      </div>
      <div className="prompter">
        {GUIDE.map((q, i) => (
          <div
            key={i}
            ref={i === qIdx ? curQRef : undefined}
            className={`pq${i === qIdx ? " cur" : ""}${i < qIdx ? " done" : ""}`}
            onClick={() => setQ(i)}
          >
            <span className="qn">Q{i + 1}</span>
            <span>{q}</span>
          </div>
        ))}
      </div>
      <div className="live-foot">
        <button className="mark" onClick={addMark}><Flag /> Mark moment</button>
        <button className="nextq" onClick={() => setQ(qIdx + 1)}>Next question →</button>
        <div className="markers">
          {markers.length === 0 ? (
            <span className="empty">No marks yet — tap &quot;Mark moment&quot; when something matters.</span>
          ) : (
            markers.map((m, i) => (
              <span className="marker" key={i}>{m}</span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
