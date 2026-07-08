// Orchestrates the floating-bar recording. The popup (inside the user gesture)
// grabs the tab-audio stream id + injects the on-page bar, then asks background
// to wire up the offscreen recorder. Offscreen records/transcribes/summarizes;
// background relays its messages back to the bar.
import { flushPending } from "./save.js";
import { APP_URL } from "./config.js";

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
  // ----- from the popup (stream id + bar already set up inside the gesture) -----
  if (m.type === "START_RECORDING") {
    (async () => {
      try {
        LOG("START_RECORDING", { tabId: m.tabId, hasStream: !!m.streamId, opts: m.opts });
        recordingTabId = m.tabId ?? null;
        await ensureOffscreen();
        LOG("offscreen ready → OFF_START");
        await chrome.runtime.sendMessage({
          target: "offscreen", type: "OFF_START",
          streamId: m.streamId || null, opts: m.opts || {},
        });
        sendResponse({ ok: true });
      } catch (e) {
        LOG("START error", e);
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
    if (["RESULT", "SAVED", "FATAL", "STATUS", "DIAG"].includes(m.type)) LOG("offscreen →", m.type, m.error || m.text || "");
    // Auto-transition: open the finished note in the app the moment it saves
    // (works even if the call tab was closed).
    if (m.type === "SAVED" && m.ok && !m.queued && m.id && m.id !== lastOpened) {
      lastOpened = m.id;
      const url = `${APP_URL}/?n=${m.id}`;
      // Redirect the meeting tab ITSELF to the finished note (the call tab
      // becomes the site). If it was closed, fall back to a fresh tab.
      const tid = recordingTabId;
      const openFresh = () => chrome.tabs.create({ url, active: true }).catch(() => {});
      if (tid != null) chrome.tabs.update(tid, { url, active: true }).catch(openFresh);
      else openFresh();
    }
    if (recordingTabId == null) return;
    const to = (payload) => chrome.tabs.sendMessage(recordingTabId, { target: "bar", ...payload }).catch(() => {});
    if (m.type === "PARTIAL") to({ type: "PARTIAL", line: m.line });
    if (m.type === "STATUS") to({ type: "STATUS", text: m.text });
    if (m.type === "RESULT") to({ type: "RESULT", transcript: m.transcript, summary: m.summary });
    if (m.type === "SAVED") to({ type: "SAVED", ok: m.ok, error: m.error });
    if (m.type === "FATAL") to({ type: "FATAL", text: m.error });
    return;
  }
});
