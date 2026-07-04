"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/data";
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
  const [markers, setMarkers] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, seconds, callAudio, start, addCallAudio, stop, reset } = useRecorder(canvasRef);

  // Start the mic when the view appears; tear it down when it leaves
  // (navigating away discards the take without creating a note).
  useEffect(() => {
    if (!show) return;
    setMarkers([]);
    setEnding(false);
    start();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

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
        {denied ? <span className="live-spacer" /> : <canvas className="live-wave" ref={canvasRef} />}
        <button className="discard" onClick={onEnd} disabled={ending}>
          Discard
        </button>
      </div>

      <div className="live-stage">
        <div className={`live-orb${denied ? " muted" : ""}`}>
          <span className="core" />
        </div>
        <div className="live-time">{mm}:{ss}</div>
        {denied ? (
          <div className="live-status warn">
            Microphone access is blocked. Allow it from the 🔒 icon in the address
            bar to record — or go back and upload a file instead.
          </div>
        ) : (
          <>
            <div className="live-status">
              {callAudio
                ? "Recording you and the call. Speak naturally — transcript + summary are ready the moment you stop."
                : "Tenet is listening to your mic. On a remote call? Add the call audio so everyone is captured — not just you."}
            </div>
            <button
              className={`call-cta${callAudio ? " on" : ""}`}
              onClick={addCallAudio}
              disabled={callAudio}
            >
              {callAudio ? "🔊 Capturing the call ✓" : "🔊 Add call audio — share the meeting tab"}
            </button>
          </>
        )}
      </div>

      <div className="live-foot">
        <button className="end-cta" onClick={endSession} disabled={ending || denied}>
          {ending ? "Saving…" : "■ Stop & summarize"}
        </button>
        <button className="mark" onClick={addMark} disabled={denied}>
          <Flag /> Mark moment
        </button>
        <div className="markers">
          {markers.length === 0 ? (
            <span className="empty">Optional — mark a moment when something matters.</span>
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
