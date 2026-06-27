// Service worker — orchestrates tab-audio capture via an offscreen document.
// The side panel can't call tabCapture/MediaRecorder directly, so:
//   side panel → background (gets a tab stream id) → offscreen (records) → IndexedDB
//   → background notifies side panel → side panel reads the blob and processes it.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});

let creating = null;
async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument();
  if (has) return;
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_CAPTURE") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
        if (!tab) throw new Error("No active tab to record.");
        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: tab.id,
        });
        await ensureOffscreen();
        await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "OFFSCREEN_START",
          streamId,
        });
        sendResponse({ ok: true, tab: { title: tab.title, url: tab.url } });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true; // async response
  }

  if (msg.type === "STOP_CAPTURE") {
    chrome.runtime
      .sendMessage({ target: "offscreen", type: "OFFSCREEN_STOP" })
      .catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});
