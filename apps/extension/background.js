// Orchestrates the floating-bar recording. The popup (inside the user gesture)
// grabs the tab-audio stream id + injects the on-page bar, then asks background
// to wire up the offscreen recorder. Offscreen records/transcribes/summarizes;
// background relays its messages back to the bar.
import { flushPending } from "./save.js";
import { APP_URL, getFreshSession } from "./config.js";

const DEBUG = true;
const LOG = (...a) => { if (DEBUG) { try { console.log("[Tenet/bg]", ...a); } catch {} } };

// Retry uploads that were queued offline — on browser start and on install/update.
chrome.runtime.onStartup.addListener(() => flushPending().catch(() => {}));
chrome.runtime.onInstalled.addListener(() => flushPending().catch(() => {}));

let recordingTabId = null;
let lastOpened = null; // note id we already auto-opened, to avoid double tabs

let creating = null;
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!creating) {
    creating = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Recording the active tab's audio for transcription.",
    });
  }
  await creating;
  creating = null;
}

chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
  // Offscreen can't read chrome.storage — it asks us for the (auto-refreshed)
  // session and we persist its breadcrumbs/diagnostics on its behalf.
  if (m.type === "GET_SESSION") {
    getFreshSession().then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (m.type === "STEP") {
    chrome.storage.local.set({ lastStep: m.s, lastStepAt: Date.now() });
    return;
  }
  if (m.type === "DBG") {
    LOG("dbg:", m.dbg?.result);
    chrome.storage.local.set({ dbg: m.dbg });
    return;
  }
  // ----- from the popup (stream id + bar already set up inside the gesture) -----
  if (m.type === "START_RECORDING") {
    (async () => {
      try {
        LOG("START_RECORDING", { tabId: m.tabId, opts: m.opts });
        recordingTabId = m.tabId ?? null;
        try { await chrome.storage.session.set({ recordingTabId }); } catch {}
        // Grab the tab-audio stream id HERE, in the long-lived worker, right
        // before the offscreen consumes it. A popup-issued id can die when the
        // popup closes → a silent/dead track. micOnly skips tab audio.
        let streamId = null;
        if (m.tabId != null && !m.opts?.micOnly) {
          streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: m.tabId });
          LOG("streamId", streamId ? "ok" : "NULL");
        }
        await ensureOffscreen();
        LOG("offscreen ready → OFF_START");
        await chrome.runtime.sendMessage({
          target: "offscreen", type: "OFF_START",
          streamId, opts: m.opts || {},
        });
        sendResponse({ ok: true });
      } catch (e) {
        LOG("START error", e);
        try { await chrome.storage.local.set({ dbg: { result: "bg-error: " + String(e?.message || e), streamId: false, ts: Date.now() } }); } catch {}
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }

  // ----- from the on-page bar -----
  if (m.type === "BAR_STOP") {
    chrome.runtime.sendMessage({ target: "offscreen", type: "OFF_STOP" }).catch(() => {});
    return;
  }
  if (m.type === "BAR_SAVE") {
    chrome.runtime.sendMessage({ target: "offscreen", type: "OFF_SAVE", title: m.title }).catch(() => {});
    return;
  }
  if (m.type === "BAR_MARK") return; // (markers are a Phase-2 nicety)

  // ----- from offscreen → relay to the bar in the recording tab -----
  if (m.target === "bg") {
    (async () => {
      if (["RESULT", "SAVED", "FATAL", "STATUS", "DIAG"].includes(m.type)) LOG("offscreen →", m.type, m.error || m.text || "");
      // Recover the recording tab across service-worker restarts.
      let tid = recordingTabId;
      if (tid == null) { try { tid = (await chrome.storage.session.get("recordingTabId")).recordingTabId ?? null; } catch {} }
      // Auto-transition: the moment the note saves, open it in a NEW tab and
      // bring the user there (works even if the call tab was closed).
      if (m.type === "SAVED" && m.ok && !m.queued && m.id && m.id !== lastOpened) {
        lastOpened = m.id;
        chrome.tabs.create({ url: `${APP_URL}/?n=${m.id}`, active: true }).catch(() => {});
      }
      if (tid == null) return;
      const to = (payload) => chrome.tabs.sendMessage(tid, { target: "bar", ...payload }).catch(() => {});
      if (m.type === "PARTIAL") to({ type: "PARTIAL", line: m.line });
      if (m.type === "STATUS") to({ type: "STATUS", text: m.text });
      if (m.type === "RESULT") to({ type: "RESULT", transcript: m.transcript, summary: m.summary });
      if (m.type === "SAVED") to({ type: "SAVED", ok: m.ok, error: m.error });
      if (m.type === "FATAL") to({ type: "FATAL", text: m.error });
    })();
    return;
  }
});
