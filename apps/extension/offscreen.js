// Records audio and transcribes it LIVE in ~12s segments (each a complete,
// independently-decodable webm), streaming partial lines to the on-page bar. A
// second continuous recorder keeps one clean file for saving. On stop it
// summarizes the accumulated transcript.
//
// Sources are mixed through a single AudioContext destination:
//   • tab audio (chrome.tabCapture)  — the other participants
//   • your microphone (optional)     — your own voice (tab capture never has it)
import { APP_URL, LOG, getFreshSession } from "./config.js";
import { saveOrQueue } from "./save.js";

const CHUNK_MS = 12000;

let audioCtx = null;
let tabStream = null;
let micStream = null;
let recStream = null; // mixed stream both recorders read from
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
let opts = {}; // { lang, template, customPrompt, mic, micOnly }
let diag = {}; // per-session diagnostics for the "empty transcript" case

chrome.runtime.onMessage.addListener((m) => {
  if (m.target !== "offscreen") return;
  if (m.type === "OFF_START") start(m.streamId, m.opts);
  if (m.type === "OFF_STOP") stop();
  if (m.type === "OFF_SAVE") save(m.title);
});

const send = (p) => chrome.runtime.sendMessage({ target: "bg", ...p }).catch(() => {});
const token = getFreshSession; // valid (auto-refreshed) session
const elapsed = () => Math.round((Date.now() - startedAt) / 1000);

function stopTracks() {
  tabStream?.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
}

async function start(streamId, startOpts) {
  opts = startOpts || {};
  diag = { tabTracks: 0, tabMuted: null, micOk: false, segs: 0, okSegs: 0, lastStatus: 0, bytes: 0 };
  LOG("offscreen start", { hasStream: !!streamId, mic: !!opts.mic, micOnly: !!opts.micOnly, lang: opts.lang });
  send({ type: "DIAG", text: `start hasStream=${!!streamId} mic=${!!opts.mic} micOnly=${!!opts.micOnly}` });
  try {
    if (streamId) {
      tabStream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
      });
      const tt = tabStream.getAudioTracks()[0];
      diag.tabTracks = tabStream.getAudioTracks().length;
      diag.tabMuted = tt ? tt.muted : null;
      LOG("offscreen: tab audio", diag.tabTracks, "track(s)", tt ? `muted=${tt.muted} state=${tt.readyState}` : "");
      send({ type: "DIAG", text: `tab audio ${diag.tabTracks} track(s) muted=${tt?.muted} state=${tt?.readyState}` });
    }

    if (opts.mic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        diag.micOk = true;
        LOG("offscreen: mic audio ok");
        send({ type: "DIAG", text: "mic audio ok" });
      } catch (e) {
        // Mic denied: fine if we still have tab audio; fatal if it was the only source.
        LOG("offscreen: mic denied", String(e?.name || e));
        send({ type: "DIAG", text: `mic denied: ${String(e?.name || e)}` });
        if (!streamId) throw new Error("Нет доступа к микрофону — разреши его и попробуй снова.");
      }
    }

    if (!tabStream && !micStream) throw new Error("Нет источника звука для записи.");

    if (tabStream && micStream) {
      // Both: mix tab audio + microphone through an AudioContext. resume() is
      // essential — an offscreen AudioContext starts suspended and would produce
      // a silent stream otherwise.
      audioCtx = new AudioContext();
      try { await audioCtx.resume(); } catch {}
      const dest = audioCtx.createMediaStreamDestination();
      const tabSrc = audioCtx.createMediaStreamSource(tabStream);
      tabSrc.connect(dest);
      tabSrc.connect(audioCtx.destination); // keep the tab audible
      audioCtx.createMediaStreamSource(micStream).connect(dest);
      recStream = dest.stream;
    } else if (tabStream) {
      // Tab only — record the RAW captured stream (no AudioContext dependency),
      // and replay it so the tab stays audible (tabCapture mutes the original).
      recStream = tabStream;
      audioCtx = new AudioContext();
      try { await audioCtx.resume(); } catch {}
      audioCtx.createMediaStreamSource(tabStream).connect(audioCtx.destination);
    } else {
      // Microphone only — record the raw mic stream.
      recStream = micStream;
    }

    partsA = [];
    recA = new MediaRecorder(recStream, { mimeType: "audio/webm" });
    recA.ondataavailable = (e) => e.data.size && partsA.push(e.data);
    recA.onstop = () => {
      lastBlob = new Blob(partsA, { type: "audio/webm" });
      stopTracks();
      audioCtx?.close();
    };
    recA.start();
    const src = tabStream && micStream ? "tab+mic" : tabStream ? "tab" : "mic";
    LOG("offscreen: recording started", { src, ctx: audioCtx?.state });
    send({ type: "DIAG", text: `recording started src=${src} ctx=${audioCtx?.state}` });

    live = [];
    recording = true;
    startedAt = Date.now();
    startSegment();
  } catch (e) {
    stopTracks();
    send({ type: "FATAL", error: String(e?.message || e) });
  }
}

function startSegment() {
  if (!recording) return;
  const base = elapsed();
  partsB = [];
  recB = new MediaRecorder(recStream, { mimeType: "audio/webm" });
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
    const lang = opts.lang || "auto";
    const tr = await fetch(`${APP_URL}/api/transcribe?dur=${CHUNK_MS / 1000}&lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      headers: { "Content-Type": "audio/webm", Authorization: `Bearer ${s.access_token}` },
      body: blob,
    });
    const { lines = [] } = await tr.json();
    diag.segs++; diag.lastStatus = tr.status; diag.bytes += blob.size;
    if (lines.length) diag.okSegs++;
    LOG("transcribe", tr.status, "→", lines.length, "line(s)", blob.size, "bytes");
    send({ type: "DIAG", text: `transcribe ${tr.status} → ${lines.length} lines, ${blob.size}b` });
    for (const l of lines) {
      const line = { start: base + (l.start || 0), speaker: l.speaker || "Speaker", text: l.text };
      if (!line.text) continue;
      live.push(line);
      send({ type: "PARTIAL", line });
    }
  } catch (e) {
    diag.segs++;
    LOG("transcribe error (segment dropped)", String(e?.message || e));
    send({ type: "DIAG", text: `transcribe ERROR: ${String(e?.message || e)}` });
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
  LOG("finalize", { lines: live.length, durSec, diag });
  send({ type: "DIAG", text: `finalize lines=${live.length} tabTracks=${diag.tabTracks} muted=${diag.tabMuted} micOk=${diag.micOk} segs=${diag.segs} okSegs=${diag.okSegs} lastStatus=${diag.lastStatus} bytes=${diag.bytes}` });
  if (!live.length) {
    let why;
    if (!diag.tabTracks && !diag.micOk) why = "не было источника звука";
    else if (!opts.micOnly && !diag.tabTracks) why = "звук вкладки не захватился (поток не сработал)";
    else if (diag.segs === 0) why = "не отправился ни один сегмент";
    else if (diag.lastStatus === 401 || diag.lastStatus === 403) why = `авторизация транскрайба (${diag.lastStatus}) — перелогинься`;
    else if (diag.lastStatus && diag.lastStatus !== 200) why = `транскрайб вернул ошибку ${diag.lastStatus}`;
    else if (diag.bytes < 2000) why = "почти не было аудио (тишина во вкладке?)";
    else why = "звук шёл, но речи не распознано (очень тихо/музыка?)";
    return send({ type: "FATAL", error: `Пусто — ${why}.` });
  }
  send({ type: "STATUS", text: "Обрабатываю…" });
  const s = await token();
  try {
    const sm = await fetch(`${APP_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({
        transcript: live,
        durSec,
        template: opts.template || "auto",
        customPrompt: opts.customPrompt || "",
      }),
    });
    const { summary } = await sm.json();
    lastResult = { transcript: live, summary: summary || { tldr: "", keyPoints: [], nextSteps: [] } };
    send({ type: "RESULT", transcript: lastResult.transcript, summary: lastResult.summary });
  } catch {
    lastResult = { transcript: live, summary: { tldr: "", keyPoints: [], nextSteps: [] } };
    send({ type: "RESULT", transcript: live, summary: lastResult.summary });
  }
}

async function save(title) {
  const s = await token();
  const uid = s?.user?.id;
  LOG("save start", { hasToken: !!s?.access_token, uid: !!uid, hasResult: !!lastResult, hasBlob: !!lastBlob?.size });
  if (!s?.access_token || !uid || !lastResult) return send({ type: "SAVED", ok: false, error: "Not ready." });
  const item = {
    id: crypto.randomUUID(),
    user_id: uid,
    title: (title || "Tab recording").slice(0, 80),
    dur_sec: durSec,
    transcript: lastResult.transcript,
    summary: lastResult.summary,
    blob: lastBlob?.size ? lastBlob : null,
    createdAt: Date.now(),
  };
  // Save now, or queue in IndexedDB and retry later — never lose a recording.
  const r = await saveOrQueue(item);
  if (r.queued) send({ type: "SAVED", ok: true, queued: true, id: item.id });
  else send({ type: "SAVED", ok: r.ok, id: item.id, error: r.error || "" });
}
