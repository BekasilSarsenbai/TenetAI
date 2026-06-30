// Records tab audio and transcribes it LIVE in ~12s segments (each a complete,
// independently-decodable webm), streaming partial lines to the on-page bar. A
// second continuous recorder keeps one clean audio file for saving. On stop it
// summarizes the accumulated transcript.
import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "./config.js";

const CHUNK_MS = 12000;

let stream = null;
let audioCtx = null;
let recA = null; // continuous → save file
let partsA = [];
let recB = null; // segmented → live transcript
let partsB = [];
let chunkTimer = null;
let recording = false;
let startedAt = 0;
let durSec = 0;
let live = []; // accumulated transcript lines
let lastBlob = null;
let lastResult = null;

chrome.runtime.onMessage.addListener((m) => {
  if (m.target !== "offscreen") return;
  if (m.type === "OFF_START") start(m.streamId);
  if (m.type === "OFF_STOP") stop();
  if (m.type === "OFF_SAVE") save(m.title);
});

const send = (p) => chrome.runtime.sendMessage({ target: "bg", ...p }).catch(() => {});
const token = async () => (await chrome.storage.local.get("session")).session || null;
const elapsed = () => Math.round((Date.now() - startedAt) / 1000);

async function start(streamId) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    });
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination); // keep audible

    partsA = [];
    recA = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recA.ondataavailable = (e) => e.data.size && partsA.push(e.data);
    recA.onstop = () => {
      lastBlob = new Blob(partsA, { type: "audio/webm" });
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
    recA.start();

    live = [];
    recording = true;
    startedAt = Date.now();
    startSegment();
  } catch (e) {
    send({ type: "FATAL", error: String(e?.message || e) });
  }
}

function startSegment() {
  if (!recording) return;
  const base = elapsed();
  partsB = [];
  recB = new MediaRecorder(stream, { mimeType: "audio/webm" });
  recB.ondataavailable = (e) => e.data.size && partsB.push(e.data);
  recB.onstop = async () => {
    await transcribeSegment(new Blob(partsB, { type: "audio/webm" }), base);
    if (recording) startSegment();
    else finalize();
  };
  recB.start();
  chunkTimer = setTimeout(() => {
    if (recB && recB.state !== "inactive") recB.stop();
  }, CHUNK_MS);
}

async function transcribeSegment(blob, base) {
  if (!blob.size) return;
  const s = await token();
  if (!s?.access_token) return;
  try {
    const tr = await fetch(`${APP_URL}/api/transcribe?dur=${CHUNK_MS / 1000}&lang=auto`, {
      method: "POST",
      headers: { "Content-Type": "audio/webm", Authorization: `Bearer ${s.access_token}` },
      body: blob,
    });
    const { lines = [] } = await tr.json();
    for (const l of lines) {
      const line = { start: base + (l.start || 0), speaker: l.speaker || "Speaker", text: l.text };
      if (!line.text) continue;
      live.push(line);
      send({ type: "PARTIAL", line });
    }
  } catch {
    /* a dropped segment shouldn't kill the session */
  }
}

function stop() {
  recording = false;
  clearTimeout(chunkTimer);
  if (recA && recA.state !== "inactive") recA.stop();
  if (recB && recB.state !== "inactive") recB.stop();
  else finalize();
}

async function finalize() {
  durSec = elapsed();
  if (!live.length) return send({ type: "FATAL", error: "Couldn't hear speech in that tab." });
  send({ type: "STATUS", text: "Summarizing…" });
  const s = await token();
  try {
    const sm = await fetch(`${APP_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({ transcript: live, durSec }),
    });
    const { summary } = await sm.json();
    lastResult = { transcript: live, summary: summary || { tldr: "", keyPoints: [], nextSteps: [] } };
    send({ type: "RESULT", transcript: lastResult.transcript, summary: lastResult.summary });
  } catch (e) {
    // still hand back the transcript even if the summary failed
    lastResult = { transcript: live, summary: { tldr: "", keyPoints: [], nextSteps: [] } };
    send({ type: "RESULT", transcript: live, summary: lastResult.summary });
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
      id, user_id: uid, title: (title || "Tab recording").slice(0, 80), who: "You",
      dur_sec: durSec, audio_path, audio_mime: audio_path ? "audio/webm" : null,
      transcript: lastResult.transcript, summary: lastResult.summary,
    };
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    send({ type: "SAVED", ok: ins.ok, error: ins.ok ? "" : (await ins.text()).slice(0, 80) });
  } catch (e) {
    send({ type: "SAVED", ok: false, error: String(e?.message || e) });
  }
}
