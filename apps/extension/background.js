// Orchestrates the floating-bar recording:
//   side panel "Record this tab" → background injects the bar + starts capture
//   → offscreen records/transcribes/summarizes → background relays to the bar.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

let recordingTabId = null;

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

const BLOCKED = /^(chrome|edge|about|chrome-extension|devtools|view-source):|^https:\/\/chrome\.google\.com\/webstore/;

chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
  // ----- from the side panel -----
  if (m.type === "START_RECORDING") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab) throw new Error("No active tab.");
        if (BLOCKED.test(tab.url || "")) {
          throw new Error(
            "This page can't be recorded. Open a normal tab that plays audio (Google Meet, Zoom, YouTube), then record."
          );
        }
        recordingTabId = tab.id;
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
        await ensureOffscreen();
        await chrome.runtime.sendMessage({ target: "offscreen", type: "OFF_START", streamId });
        sendResponse({ ok: true, title: tab.title });
      } catch (e) {
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
  if (m.target === "bg" && recordingTabId != null) {
    const to = (payload) => chrome.tabs.sendMessage(recordingTabId, { target: "bar", ...payload }).catch(() => {});
    if (m.type === "PARTIAL") to({ type: "PARTIAL", line: m.line });
    if (m.type === "STATUS") to({ type: "STATUS", text: m.text });
    if (m.type === "RESULT") to({ type: "RESULT", transcript: m.transcript, summary: m.summary });
    if (m.type === "SAVED") to({ type: "SAVED", ok: m.ok, error: m.error });
    if (m.type === "FATAL") to({ type: "FATAL", text: m.error });
    return;
  }
});
