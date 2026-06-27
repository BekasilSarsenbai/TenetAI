// Records the captured tab-audio stream and stashes the result in IndexedDB.
import { putBlob } from "./idb.js";

let recorder = null;
let chunks = [];
let stream = null;
let audioCtx = null;
let startedAt = 0;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "OFFSCREEN_START") start(msg.streamId);
  if (msg.type === "OFFSCREEN_STOP") stop();
});

async function start(streamId) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    // tabCapture mutes the tab for the user — re-route it to the speakers so
    // the call stays audible while we record.
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination);

    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = onStop;
    recorder.start();
    startedAt = Date.now();
    send({ type: "REC_STARTED" });
  } catch (e) {
    send({ type: "REC_ERROR", error: String(e?.message || e) });
  }
}

function stop() {
  if (recorder && recorder.state !== "inactive") recorder.stop();
}

async function onStop() {
  const durSec = Math.round((Date.now() - startedAt) / 1000);
  const blob = new Blob(chunks, { type: "audio/webm" });
  stream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();
  try {
    await putBlob("last", blob);
    send({ type: "AUDIO_READY", durSec, size: blob.size });
  } catch (e) {
    send({ type: "REC_ERROR", error: String(e?.message || e) });
  }
}

function send(payload) {
  chrome.runtime.sendMessage({ target: "sidepanel", ...payload }).catch(() => {});
}
