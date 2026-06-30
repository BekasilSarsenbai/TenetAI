// Records the captured tab audio, then transcribes + summarizes it via the Tenet
// API and (on request) saves it to Supabase. Reports progress/results to the
// background, which relays them to the on-page bar.
import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "./config.js";

let recorder = null;
let chunks = [];
let stream = null;
let audioCtx = null;
let lastBlob = null;
let lastResult = null;
let durSec = 0;
let startedAt = 0;

chrome.runtime.onMessage.addListener((m) => {
  if (m.target !== "offscreen") return;
  if (m.type === "OFF_START") start(m.streamId);
  if (m.type === "OFF_STOP") stop();
  if (m.type === "OFF_SAVE") save(m.title);
});

const send = (p) => chrome.runtime.sendMessage({ target: "bg", ...p }).catch(() => {});

async function token() {
  const { session } = await chrome.storage.local.get("session");
  return session || null;
}

async function start(streamId) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    });
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination); // keep tab audible
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = onStop;
    recorder.start();
    startedAt = Date.now();
  } catch (e) {
    send({ type: "FATAL", error: String(e?.message || e) });
  }
}

function stop() {
  if (recorder && recorder.state !== "inactive") recorder.stop();
}

async function onStop() {
  durSec = Math.round((Date.now() - startedAt) / 1000);
  lastBlob = new Blob(chunks, { type: "audio/webm" });
  stream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();

  const s = await token();
  if (!s?.access_token) return send({ type: "FATAL", error: "Open the Tenet panel and sign in first." });
  if (!lastBlob.size) return send({ type: "FATAL", error: "No audio was captured." });

  try {
    send({ type: "STATUS", text: "Transcribing…" });
    const tr = await fetch(`${APP_URL}/api/transcribe?dur=${durSec}&lang=auto`, {
      method: "POST",
      headers: { "Content-Type": "audio/webm", Authorization: `Bearer ${s.access_token}` },
      body: lastBlob,
    });
    const { lines = [] } = await tr.json();
    if (!lines.length) return send({ type: "FATAL", error: "Couldn't hear speech in that tab." });

    send({ type: "STATUS", text: "Summarizing…" });
    const sm = await fetch(`${APP_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({ transcript: lines, durSec }),
    });
    const { summary } = await sm.json();
    lastResult = { transcript: lines, summary: summary || { tldr: "", keyPoints: [], nextSteps: [] } };
    send({ type: "RESULT", transcript: lastResult.transcript, summary: lastResult.summary });
  } catch (e) {
    send({ type: "FATAL", error: String(e?.message || e) });
  }
}

async function save(title) {
  const s = await token();
  const uid = s?.user?.id;
  if (!s?.access_token || !uid || !lastResult) return send({ type: "SAVED", ok: false, error: "Not ready." });
  try {
    const id = crypto.randomUUID();
    let audio_path = null;
    if (lastBlob?.size) {
      audio_path = `${uid}/${id}.webm`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${audio_path}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "audio/webm" },
        body: lastBlob,
      });
      if (!up.ok) audio_path = null;
    }
    const row = {
      id,
      user_id: uid,
      title: (title || "Tab recording").slice(0, 80),
      who: "You",
      dur_sec: durSec,
      audio_path,
      audio_mime: audio_path ? "audio/webm" : null,
      transcript: lastResult.transcript,
      summary: lastResult.summary,
    };
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    send({ type: "SAVED", ok: ins.ok, error: ins.ok ? "" : (await ins.text()).slice(0, 80) });
  } catch (e) {
    send({ type: "SAVED", ok: false, error: String(e?.message || e) });
  }
}
