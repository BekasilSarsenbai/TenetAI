# Chrome Web Store — submission pack (Tenet)

Everything needed to publish the extension. Copy/paste the fields, attach the
screenshots, submit. The technical build is `apps/tenet-extension.zip`.

> **Before the FINAL production submit:** set `DEBUG = false` in `config.js` and
> in `background.js` (silences the `[Tenet]` console logs), rebuild the zip, and
> upload that. Keep `DEBUG = true` while still testing.

---

## Store listing

**Item name** (≤45 chars)
```
Tenet — record & summarize calls
```

**Summary** (≤132 chars)
```
Record any call from your browser tab — no bot joins. Get an AI transcript and summary linked to the exact second.
```

**Category:** Productivity
**Language:** English

**Description**
```
Tenet turns any browser call into a searchable transcript and a clean AI summary — without a bot ever joining your meeting.

Press record on your Google Meet, Zoom (web), Teams (web), Whereby or any tab with audio. Tenet captures the tab's audio (the other participants) and, optionally, your microphone — mixes them, and transcribes the conversation with speaker labels. When you stop, you get:

• A tidy TL;DR, the key points, and the action items
• A full transcript with Speaker 1 / Speaker 2 labels
• Everything linked to the exact second it was said
• A grounded AI chat you can ask about the meeting

No bot joins the call. Nothing is recorded in the background — capture happens only while you're actively recording, and a small on-page bar always shows you it's on. Your recordings, transcripts and summaries are private to your account.

Sign in with the same account as app.tenet.blog and your notes sync straight to the web app.

Why Tenet
• No awkward bot in the participant list
• Speaker-separated transcripts (Deepgram)
• Summaries tuned to the call type (1:1, sales, interview, lecture)
• Your voice + the other side, captured together
• Open it later in the web app — search, replay, chat

Tenet only talks to its own services. See our privacy policy: https://tenet.blog/privacy
```

---

## Privacy tab (required)

**Single purpose**
```
Tenet records the audio of a browser tab the user explicitly chooses to record, then produces an AI transcript and summary saved to the user's Tenet account.
```

**Permission justifications**
| Permission | Justification |
|---|---|
| `tabCapture` | Record the current tab's audio when the user presses Record, to transcribe and summarize their call. Capture happens only during an explicit recording. |
| `activeTab` | Show the on-page recording controls on the tab the user chose to record. |
| `scripting` | Inject that on-page recording bar into the active tab at record time. |
| `offscreen` | Run the audio recorder (MV3 needs an offscreen document to use MediaRecorder). |
| `storage` | Keep the user signed in and hold a finished recording locally until it finishes uploading (offline resilience). |
| Host `app.tenet.blog` | Send audio/transcripts to Tenet's own API for transcription & summaries. |
| Host `*.supabase.co` | Store the recording and notes in the user's own account (row-level secured). |

**Remote code:** No — all code is in the package.

**Data collection disclosure**
- Personally identifiable info: **Email** — used for authentication only.
- User activity / audio: **Recordings the user explicitly captures** — used to provide the transcript/summary feature.
- Certifications: not sold to third parties; not used for anything unrelated to the single purpose; not used for creditworthiness/lending.

**Privacy policy URL**
```
https://tenet.blog/privacy
```

---

## Screenshots (attach 3–5, 1280×800 or 640×400 PNG)

Take these from a real session (source previews are in `~/Downloads/tenet-*.html`):
1. **Popup launcher** — the call-type templates + language + "Начать запись".
2. **On-page capsule** — the `● 0:34` recording bar on a live Meet tab.
3. **Note in the web app** — transcript with Speaker 1/2 + the summary.
4. **AI chat** — a grounded question/answer on the meeting.
5. *(optional)* The saved-state capsule "Сохранено → Tenet".

Small promo tile (440×280) and marquee (1400×560) are optional but help ranking.

---

## Submit checklist
- [ ] One-time: register a Chrome Web Store developer account ($5) at
      https://chrome.google.com/webstore/devconsole
- [ ] `DEBUG = false` in `config.js` + `background.js`; rebuild `tenet-extension.zip`
- [ ] Upload the zip → fill the listing fields above
- [ ] Fill the Privacy tab (single purpose + every justification + disclosures)
- [ ] Add screenshots + privacy policy URL
- [ ] Submit for review (typically 1–3 days)

After approval, update `CHROME_STORE_URL` and flip `SHOW_EXTENSION_PROMPT = true`
in `apps/web/lib/links.ts` to surface the install prompt in the app.
