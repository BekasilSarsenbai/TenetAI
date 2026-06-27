import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "./config.js";
import { getBlob } from "./idb.js";

const LOGO_PATH =
  "M 41.30,11.46 C 38.80,15.26 33.87,22.46 30.41,27.45 C 26.89,32.50 23.94,36.81 23.83,37.10 C 23.77,37.32 18.50,38.91 12.14,40.61 C 5.79,42.26 0.52,43.68 0.46,43.79 C 0.35,43.90 0.18,44.47 0.06,45.09 C -0.11,46.23 0.23,46.23 14.07,46.40 C 30.18,46.57 26.83,47.82 40.33,36.42 L 46.12,31.48 L 46.12,18.04 C 46.12,10.61 46.06,4.54 46.00,4.54 C 45.89,4.60 43.79,7.66 41.30,11.46 M 54.11,18.15 C 54.06,33.35 52.53,30.29 65.80,41.24 L 72.21,46.51 L 86.10,46.51 C 98.98,46.51 100.00,46.46 100.00,45.49 C 100.00,44.98 99.77,44.24 99.55,43.96 C 99.32,43.62 95.35,42.43 90.64,41.18 C 85.99,39.99 80.89,38.63 79.35,38.12 C 76.29,37.04 77.20,38.17 64.78,20.14 C 61.60,15.43 58.20,10.55 57.23,9.30 C 56.27,8.00 55.19,6.47 54.80,5.90 C 54.28,5.05 54.11,7.60 54.11,18.15 M 0.06,54.68 C -0.22,56.04 0.00,56.10 11.41,58.93 C 17.81,60.52 23.09,61.88 23.15,61.94 C 23.20,62.05 26.15,66.31 29.61,71.47 C 33.13,76.63 38.23,84.12 41.07,88.14 L 46.12,95.46 L 46.12,81.56 L 46.12,67.61 L 37.33,60.46 L 28.53,53.32 L 14.41,53.32 C 0.29,53.32 0.29,53.32 0.06,54.68 M 68.12,56.27 C 66.08,57.91 62.11,61.20 59.28,63.53 L 54.06,67.78 L 54.06,81.34 C 54.06,94.89 54.06,94.89 55.36,92.96 C 65.29,78.33 76.06,63.19 77.09,62.34 C 77.82,61.71 87.52,58.99 96.20,56.95 C 99.60,56.15 100.00,55.93 100.00,54.68 C 100.00,53.32 100.00,53.32 85.88,53.32 C 71.81,53.32 71.81,53.32 68.12,56.27";
document.getElementById("logoPath").setAttribute("d", LOGO_PATH);

const $ = (id) => document.getElementById(id);
const fmt = (s) => {
  s = Math.max(0, Math.round(s || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

let session = null;
let mode = "signin";
let timerInt = null;
let startMs = 0;
let lastResult = null;
let tabTitle = "";

const VIEWS = ["login", "home", "recording", "processing", "result"];
function show(v) {
  VIEWS.forEach((x) => $("v-" + x).classList.toggle("on", x === v));
}

/* ---------- session storage ---------- */
async function loadSession() {
  return (await chrome.storage.local.get("session")).session || null;
}
const saveSession = (s) => chrome.storage.local.set({ session: s });
const clearSession = () => chrome.storage.local.remove("session");

/* ---------- supabase auth (REST) ---------- */
async function authRequest(email, password, signup) {
  const url = signup
    ? `${SUPABASE_URL}/auth/v1/signup`
    : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = await res.json();
  if (!res.ok)
    throw new Error(d.error_description || d.msg || d.error || "Sign in failed");
  const s = d.access_token ? d : d.session;
  if (!s?.access_token) throw new Error("Check your email to confirm, then sign in.");
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    user: d.user || s.user,
    expires_at: Date.now() + (s.expires_in || 3600) * 1000,
  };
}

function fireWelcome(email) {
  fetch(`${APP_URL}/api/welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => {});
}

/* ---------- record control ---------- */
$("start-btn").onclick = async () => {
  const resp = await chrome.runtime.sendMessage({ type: "START_CAPTURE" });
  if (!resp?.ok) {
    alert(resp?.error || "Couldn't start. Open a tab that's playing audio, then record.");
    return;
  }
  tabTitle = resp.tab?.title || "This tab";
  $("tab-name").textContent = tabTitle;
};
$("stop-btn").onclick = () => chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "sidepanel") return;
  if (msg.type === "REC_STARTED") startTimer();
  if (msg.type === "REC_ERROR") {
    stopTimer();
    alert("Recording error: " + msg.error);
    show("home");
  }
  if (msg.type === "AUDIO_READY") {
    stopTimer();
    processAudio(msg.durSec);
  }
});

function startTimer() {
  show("recording");
  startMs = Date.now();
  $("timer").textContent = "00:00";
  timerInt = setInterval(
    () => ($("timer").textContent = fmt((Date.now() - startMs) / 1000)),
    500
  );
}
function stopTimer() {
  clearInterval(timerInt);
  timerInt = null;
}

/* ---------- process: transcribe + summarize ---------- */
async function processAudio(durSec) {
  show("processing");
  const status = $("proc-status");
  status.textContent = "Transcribing…";
  const blob = await getBlob("last");
  if (!blob || !blob.size) {
    status.textContent = "No audio captured.";
    setTimeout(() => show("home"), 1600);
    return;
  }
  try {
    const tr = await fetch(`${APP_URL}/api/transcribe?dur=${durSec}&lang=auto`, {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: blob,
    });
    const trData = await tr.json();
    const lines = trData.lines || [];
    if (!lines.length) {
      status.textContent = "Couldn't hear speech in that tab.";
      setTimeout(() => show("home"), 1800);
      return;
    }
    status.textContent = "Summarizing…";
    const sm = await fetch(`${APP_URL}/api/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ transcript: lines, durSec }),
    });
    const smData = await sm.json();
    lastResult = {
      transcript: lines,
      summary: smData.summary || { tldr: "", keyPoints: [], nextSteps: [] },
      durSec,
    };
    renderResult(lastResult);
  } catch (e) {
    status.textContent = "Error: " + String(e.message || e);
    setTimeout(() => show("home"), 2200);
  }
}

function renderResult(r) {
  $("tldr").textContent = r.summary.tldr || "—";

  const kp = $("keypoints");
  kp.innerHTML = "";
  (r.summary.keyPoints || []).forEach((k) => {
    const el = document.createElement("div");
    el.className = "kp";
    const sec = document.createElement("span");
    sec.className = "sec";
    sec.textContent = fmt(k.start);
    const txt = document.createElement("span");
    txt.className = "txt";
    txt.textContent = k.text || "";
    el.append(sec, txt);
    kp.appendChild(el);
  });
  $("kp-card").style.display = (r.summary.keyPoints || []).length ? "" : "none";

  const ns = $("nextsteps");
  ns.innerHTML = "";
  (r.summary.nextSteps || []).forEach((s) => {
    const el = document.createElement("div");
    el.className = "step";
    el.textContent = s;
    ns.appendChild(el);
  });
  $("steps-card").style.display = (r.summary.nextSteps || []).length ? "" : "none";

  const tx = $("transcript");
  tx.innerHTML = "";
  (r.transcript || []).forEach((l) => {
    const el = document.createElement("div");
    el.className = "tx-line";
    const t = document.createElement("span");
    t.className = "t";
    t.textContent = fmt(l.start);
    const s = document.createElement("span");
    s.textContent = l.text || "";
    el.append(t, s);
    tx.appendChild(el);
  });

  $("save-msg").textContent = "";
  show("result");
}

/* ---------- save to Tenet (Supabase REST) ---------- */
$("save-btn").onclick = async () => {
  const msg = $("save-msg");
  const btn = $("save-btn");
  btn.disabled = true;
  msg.style.color = "var(--muted)";
  msg.textContent = "Saving…";
  try {
    const uid = session.user.id;
    const id = crypto.randomUUID();
    const blob = await getBlob("last");
    let audio_path = null;
    if (blob && blob.size) {
      audio_path = `${uid}/${id}.webm`;
      const up = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${audio_path}`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "audio/webm",
          },
          body: blob,
        }
      );
      if (!up.ok) audio_path = null;
    }
    const row = {
      id,
      user_id: uid,
      title: (tabTitle || "Tab recording").slice(0, 80),
      who: "You",
      dur_sec: lastResult.durSec,
      audio_path,
      audio_mime: audio_path ? "audio/webm" : null,
      transcript: lastResult.transcript,
      summary: lastResult.summary,
    };
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!ins.ok) throw new Error((await ins.text()).slice(0, 80) || "Save failed");
    msg.style.color = "var(--amber)";
    msg.innerHTML = 'Saved ✓ — <a href="' + APP_URL + '" target="_blank" style="color:var(--amber)">open in Tenet</a>';
  } catch (e) {
    msg.style.color = "var(--rec)";
    msg.textContent = String(e.message || e);
  } finally {
    btn.disabled = false;
  }
};
$("new-btn").onclick = () => {
  $("save-msg").textContent = "";
  show("home");
};

/* ---------- login UI ---------- */
$("toggle-mode").onclick = () => {
  mode = mode === "signin" ? "signup" : "signin";
  $("login-title").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("login-btn").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("toggle-mode").innerHTML =
    mode === "signup"
      ? 'Have an account? <u>Sign in</u>'
      : 'New here? <u>Create an account</u>';
  $("login-err").textContent = "";
};
async function doLogin() {
  const email = $("email").value.trim();
  const password = $("password").value;
  const err = $("login-err");
  const btn = $("login-btn");
  if (!email || !password) {
    err.textContent = "Enter email and password.";
    return;
  }
  btn.disabled = true;
  err.textContent = "";
  try {
    session = await authRequest(email, password, mode === "signup");
    await saveSession(session);
    if (mode === "signup") fireWelcome(email);
    enterApp();
  } catch (e) {
    err.textContent = String(e.message || e);
  } finally {
    btn.disabled = false;
  }
}
$("login-btn").onclick = doLogin;
$("password").addEventListener("keydown", (e) => e.key === "Enter" && doLogin());

$("acct").onclick = async () => {
  if (confirm("Sign out of Tenet?")) {
    await clearSession();
    session = null;
    $("acct").hidden = true;
    show("login");
  }
};

function enterApp() {
  const acct = $("acct");
  acct.textContent = session.user?.email || "Account";
  acct.hidden = false;
  show("home");
}

/* ---------- init ---------- */
(async () => {
  session = await loadSession();
  if (session && session.expires_at > Date.now() + 60000) enterApp();
  else {
    if (session) await clearSession();
    session = null;
    show("login");
  }
})();
