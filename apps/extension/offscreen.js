// Records the call into ONE continuous file and transcribes it ONCE at stop.
// Why: speaker diarization needs the whole conversation — 12-second segments
// collapse every voice into "Speaker 1" and split words at chunk borders
// (verified empirically against Deepgram). The full file goes to Supabase
// storage first (it's saved for playback anyway), then /api/transcribe gets a
// short-lived signed link — so request-size limits never apply.
//
// Sources are mixed through a single AudioContext destination:
//   • tab audio (chrome.tabCapture)  — the other participants
//   • your microphone (optional)     — your own voice (tab capture never has it)
//
// IMPORTANT: offscreen documents can NOT use chrome.storage (only
// chrome.runtime messaging). The session token and all breadcrumbs go through
// the background worker — never touch chrome.storage from this file.
import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, LOG, fetchT } from "./config.js";
import { saveOrQueue } from "./save.js";

let audioCtx = null;
let tabStream = null;
let micStream = null;
let recStream = null; // mixed stream the recorder reads from
let rec = null;
let parts = [];
let recording = false;
let startedAt = 0;
let durSec = 0;
let lastBlob = null;
let lastResult = null;
let uploaded = null; // { id, audio_path } once the audio is in storage
let opts = {}; // { lang, template, customPrompt, mic, micOnly, tabTitle }
let diag = {}; // per-session diagnostics (written to storage by the bg worker)
let saving = false;
let savedOnce = false;
let capTimer = null; // safety cap so a forgotten recording can't run forever

chrome.runtime.onMessage.addListener((m) => {
  if (m.target !== "offscreen") return;
  if (m.type === "OFF_START") start(m.streamId, m.opts);
  if (m.type === "OFF_STOP") stop();
  if (m.type === "OFF_SAVE") save(m.title);
});

const send = (p) => chrome.runtime.sendMessage({ target: "bg", ...p }).catch(() => {});
// Breadcrumb that survives SW/offscreen death — the bg worker writes it to storage.
const step = (s) => { LOG("step:", s); send({ type: "STEP", s }); };
// Full diagnostic snapshot of the last recording — bg persists it.
function dumpDbg(result) { send({ type: "DBG", dbg: { ...diag, result, ts: Date.now() } }); }
// Valid (auto-refreshed) session — fetched FROM THE BG WORKER (which has storage).
// Never throws; null means signed out.
const token = () => chrome.runtime.sendMessage({ type: "GET_SESSION" }).catch(() => null);
const elapsed = () => Math.round((Date.now() - startedAt) / 1000);

function stopTracks() {
  tabStream?.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
}

async function start(streamId, startOpts) {
  if (recording) { LOG("already recording — start ignored"); return send({ type: "DIAG", text: "start ignored: already recording" }); }
  opts = startOpts || {};
  uploaded = null;
  lastBlob = null;
  lastResult = null;
  saving = false;
  savedOnce = false;
  diag = { streamId: !!streamId, tabTracks: 0, tabMuted: null, tabEnded: false, micOk: false, bytes: 0 };
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
      if (tt) tt.addEventListener("ended", () => { diag.tabEnded = true; LOG("offscreen: tab track ENDED"); });
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

    parts = [];
    rec = new MediaRecorder(recStream, { mimeType: "audio/webm" });
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      lastBlob = new Blob(parts, { type: "audio/webm" });
      stopTracks();
      audioCtx?.close();
      finalize();
    };
    rec.start(1000); // gather data continuously; ONE blob at stop

    recording = true;
    startedAt = Date.now();
    clearTimeout(capTimer);
    capTimer = setTimeout(() => { if (recording) { LOG("safety cap: 3h — stopping"); stop(); } }, 3 * 3600 * 1000);
    const src = tabStream && micStream ? "tab+mic" : tabStream ? "tab" : "mic";
    LOG("offscreen: recording started", { src, ctx: audioCtx?.state });
    send({ type: "DIAG", text: `recording started src=${src} ctx=${audioCtx?.state}` });
    step("recording");
  } catch (e) {
    stopTracks();
    dumpDbg("start-error: " + String(e?.message || e));
    send({ type: "FATAL", error: String(e?.message || e) });
  }
}

function stop() {
  if (!recording) return;
  recording = false;
  clearTimeout(capTimer);
  step("stopping");
  if (rec && rec.state !== "inactive") rec.stop(); // onstop → finalize()
  else finalize();
}

async function finalize() {
  durSec = elapsed();
  step("finalizing");
  diag.bytes = lastBlob?.size || 0;
  LOG("finalize", { bytes: diag.bytes, durSec });
  if (!lastBlob?.size) {
    dumpDbg("empty: аудио не записалось");
    return send({ type: "FATAL", error: "Пусто — аудио не записалось. Проверь, что был звук." });
  }
  send({ type: "STATUS", text: "Обрабатываю…" });

  const s = await token();
  if (!s?.access_token || !s?.user?.id) {
    dumpDbg("no session");
    return send({ type: "FATAL", error: "Нет сессии — войди в расширении и попробуй снова." });
  }

  // 1) Upload the full recording to storage (it's kept for playback anyway),
  //    then mint a short-lived signed link for the transcriber.
  const id = crypto.randomUUID();
  const audio_path = `${s.user.id}/${id}.webm`;
  let mediaUrl = null;
  try {
    step("uploading");
    const up = await fetchT(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${audio_path}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "audio/webm" },
      body: lastBlob,
    }, 180000);
    diag.upStatus = up.status;
    LOG("audio upload", up.status);
    if (up.ok) {
      uploaded = { id, audio_path };
      const sign = await fetchT(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${audio_path}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 900 }),
      }, 15000);
      diag.signStatus = sign.status;
      if (sign.ok) {
        const d = await sign.json();
        if (d?.signedURL) mediaUrl = `${SUPABASE_URL}/storage/v1${d.signedURL}`;
      }
    }
  } catch (e) {
    LOG("upload error", String(e?.message || e));
  }

  // 2) Transcribe the WHOLE file — full audio is what makes diarization and
  //    language detection work. Falls back to a raw-body upload (small files).
  let lines = [];
  try {
    step("transcribing");
    const lang = encodeURIComponent(opts.lang || "auto");
    const tr = mediaUrl
      ? await fetchT(`${APP_URL}/api/transcribe?lang=${lang}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
          body: JSON.stringify({ url: mediaUrl }),
        }, 240000)
      : await fetchT(`${APP_URL}/api/transcribe?lang=${lang}`, {
          method: "POST",
          headers: { "Content-Type": "audio/webm", Authorization: `Bearer ${s.access_token}` },
          body: lastBlob,
        }, 240000);
    diag.trStatus = tr.status;
    const d = await tr.json();
    lines = Array.isArray(d?.lines) ? d.lines : [];
    LOG("transcribe", tr.status, "→", lines.length, "line(s)");
    send({ type: "DIAG", text: `transcribe ${tr.status} → ${lines.length} lines` });
  } catch (e) {
    diag.trError = String(e?.message || e).slice(0, 120);
    LOG("transcribe error", diag.trError);
  }
  diag.lines = lines.length;
  if (!lines.length) {
    dumpDbg("empty transcript");
    const why =
      diag.trStatus === 401 || diag.trStatus === 403
        ? "Сессия истекла — открой расширение и войди заново."
        : diag.trStatus && diag.trStatus !== 200
          ? `Сервер не ответил (${diag.trStatus}) — попробуй ещё раз.`
          : "Не удалось расслышать речь — проверь, что был звук.";
    return send({ type: "FATAL", error: why });
  }

  // 3) Summarize.
  try {
    step("summarizing");
    const sm = await fetchT(`${APP_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({
        transcript: lines,
        durSec,
        template: opts.template || "auto",
        customPrompt: opts.customPrompt || "",
      }),
    }, 25000);
    const { summary } = await sm.json();
    lastResult = { transcript: lines, summary: summary || { tldr: "", keyPoints: [], nextSteps: [] } };
  } catch {
    lastResult = { transcript: lines, summary: { tldr: "", keyPoints: [], nextSteps: [] } };
  }
  dumpDbg(`ok: ${lines.length} lines`);
  send({ type: "RESULT", transcript: lastResult.transcript, summary: lastResult.summary });
  // Save AUTONOMOUSLY — never depend on the on-page bar (the call tab is often
  // closed right after hanging up, and then nobody would trigger the save).
  save(opts.tabTitle || "");
}

async function save(title) {
  if (saving || savedOnce) return; // BAR_SAVE may arrive too — first one wins
  saving = true;
  const s = await token();
  const uid = s?.user?.id;
  LOG("save start", { hasToken: !!s?.access_token, uid: !!uid, hasResult: !!lastResult, uploaded: !!uploaded });
  if (!s?.access_token || !uid || !lastResult) {
    saving = false;
    return send({ type: "SAVED", ok: false, error: "Not ready." });
  }
  const item = {
    id: uploaded?.id || crypto.randomUUID(),
    user_id: uid,
    title: (title || "Tab recording").slice(0, 80),
    dur_sec: durSec,
    transcript: lastResult.transcript,
    summary: lastResult.summary,
    // Audio is normally uploaded during finalize; keep the blob only if not.
    audio_path: uploaded?.audio_path || null,
    blob: uploaded ? null : lastBlob?.size ? lastBlob : null,
    createdAt: Date.now(),
  };
  step("saving");
  const r = await saveOrQueue(item, s);
  savedOnce = r.ok || r.queued;
  saving = false;
  step(r.ok ? "saved" : r.queued ? "save-queued" : "save-failed:" + (r.error || ""));
  if (r.queued) send({ type: "SAVED", ok: true, queued: true, id: item.id });
  else send({ type: "SAVED", ok: r.ok, id: item.id, error: r.error || "" });
}
