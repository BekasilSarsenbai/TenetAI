# Tenet — Chrome extension

Record any call straight from your browser tab (no bot joins), then get an AI
transcript + summary with every key point linked to the exact second — right in
the side panel. Talks to the same backend as the Tenet web app
(`app.tenet.blog` + Supabase), reusing your account, transcription and summary.

## Load it (developer mode)

1. Open **`chrome://extensions`**
2. Toggle **Developer mode** (top-right) on
3. Click **Load unpacked** → select this `apps/extension` folder
4. Pin the Tenet icon, click it → the **side panel** opens

## Use it

1. Sign in (the same email + password as the web app — or create an account)
2. Open the meeting tab (Google Meet, Zoom web, a YouTube call, anything playing audio)
3. Hit **Start recording** → talk / let the call run → **Stop & summarize**
4. Transcript + summary appear in the panel; **Save to Tenet** stores it in your account

## How it works

| Piece | Tech |
|---|---|
| Tab-audio capture | `chrome.tabCapture` → offscreen document → `MediaRecorder` (re-routes audio so the tab stays audible) |
| Blob hand-off | shared IndexedDB (offscreen → side panel) |
| Auth | Supabase email/password via REST (`@supabase` not bundled) |
| Transcribe / summarize | `POST app.tenet.blog/api/{transcribe,summarize}` with a Bearer token (CORS-enabled, token-gated) |
| Save | Supabase Storage (`recordings`) + `meetings` table (RLS-scoped to the user) |

## Files

```
manifest.json     MV3 manifest (sidePanel, tabCapture, offscreen)
background.js     service worker — orchestrates capture
offscreen.html/js records the tab stream, stashes the blob in IndexedDB
sidepanel.html/css/js   the branded UI (login → record → result)
idb.js / config.js      shared helpers
icons/            16/48/128 PNG (regenerate from icon.svg)
```

## Publishing to the Chrome Web Store (later)

- One-time **$5** developer registration at the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole)
- Zip this folder, upload, add screenshots + a privacy policy, submit (review ~1–3 days)
- Replace the dev icons with final-quality PNGs (the current ones are rendered from `icon.svg`)

## Polish TODO

- Bundle the **Manrope** font for pixel-perfect brand match (currently falls back to system sans)
- Refresh-token flow (right now an expired session asks you to sign in again)
- Live partial transcript while recording
