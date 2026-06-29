"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "denied"
  | "error";

export type RecordResult = { blob: Blob; url: string; durationSec: number };

// Pick the best-supported Opus container; fall back to the browser default.
function pickMime(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) return c;
  return "";
}

/**
 * Real microphone capture. Records via MediaRecorder, draws a live level meter
 * onto the supplied canvas from an AnalyserNode, and tracks elapsed seconds.
 * stop() resolves with the finished audio blob + an object URL for playback.
 */
export function useRecorder(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    analyserRef.current = null;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);

    const bars = 40;
    const gap = 2;
    const bw = (w - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[Math.floor((i / bars) * bins)] / 255;
      const bh = Math.max(2, v * h);
      const x = i * (bw + gap);
      const y = (h - bh) / 2;
      ctx.fillStyle = v > 0.05 ? "#F2C14E" : "#3a3320";
      const r = Math.min(bw / 2, 2);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, r);
      ctx.fill();
    }
    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef]);

  const start = useCallback(async () => {
    setSeconds(0);
    chunksRef.current = [];
    setStatus("requesting");

    let stream: MediaStream;
    try {
      // Speech-tuned capture: clean the signal so transcription stays accurate.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      return;
    }
    streamRef.current = stream;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;

      // Prefer Opus at a generous bitrate — best quality-per-byte for speech.
      const mime = pickMime();
      const rec = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 128000,
      });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      recRef.current = rec;
      // Timeslice: flush a chunk every second so we never end up with an empty
      // blob even if the final stop event misbehaves.
      rec.start(1000);
      startedAtRef.current = performance.now();
      setStatus("recording");

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) rafRef.current = requestAnimationFrame(draw);
    } catch {
      teardown();
      setStatus("error");
    }
  }, [draw, teardown]);

  const stop = useCallback(() => {
    return new Promise<RecordResult | null>((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === "inactive") {
        teardown();
        setStatus("stopped");
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        const durationSec = Math.max(
          1,
          Math.round((performance.now() - startedAtRef.current) / 1000)
        );
        teardown();
        setStatus("stopped");
        resolve({ blob, url, durationSec });
      };
      try {
        rec.stop();
      } catch {
        teardown();
        setStatus("error");
        resolve(null);
      }
    });
  }, [teardown]);

  const reset = useCallback(() => {
    teardown();
    recRef.current = null;
    chunksRef.current = [];
    setStatus("idle");
    setSeconds(0);
  }, [teardown]);

  useEffect(() => () => teardown(), [teardown]);

  return { status, seconds, start, stop, reset };
}
