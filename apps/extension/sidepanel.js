import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const LOGO_PATH =
  "M 41.30,11.46 C 38.80,15.26 33.87,22.46 30.41,27.45 C 26.89,32.50 23.94,36.81 23.83,37.10 C 23.77,37.32 18.50,38.91 12.14,40.61 C 5.79,42.26 0.52,43.68 0.46,43.79 C 0.35,43.90 0.18,44.47 0.06,45.09 C -0.11,46.23 0.23,46.23 14.07,46.40 C 30.18,46.57 26.83,47.82 40.33,36.42 L 46.12,31.48 L 46.12,18.04 C 46.12,10.61 46.06,4.54 46.00,4.54 C 45.89,4.60 43.79,7.66 41.30,11.46 M 54.11,18.15 C 54.06,33.35 52.53,30.29 65.80,41.24 L 72.21,46.51 L 86.10,46.51 C 98.98,46.51 100.00,46.46 100.00,45.49 C 100.00,44.98 99.77,44.24 99.55,43.96 C 99.32,43.62 95.35,42.43 90.64,41.18 C 85.99,39.99 80.89,38.63 79.35,38.12 C 76.29,37.04 77.20,38.17 64.78,20.14 C 61.60,15.43 58.20,10.55 57.23,9.30 C 56.27,8.00 55.19,6.47 54.80,5.90 C 54.28,5.05 54.11,7.60 54.11,18.15 M 0.06,54.68 C -0.22,56.04 0.00,56.10 11.41,58.93 C 17.81,60.52 23.09,61.88 23.15,61.94 C 23.20,62.05 26.15,66.31 29.61,71.47 C 33.13,76.63 38.23,84.12 41.07,88.14 L 46.12,95.46 L 46.12,81.56 L 46.12,67.61 L 37.33,60.46 L 28.53,53.32 L 14.41,53.32 C 0.29,53.32 0.29,53.32 0.06,54.68 M 68.12,56.27 C 66.08,57.91 62.11,61.20 59.28,63.53 L 54.06,67.78 L 54.06,81.34 C 54.06,94.89 54.06,94.89 55.36,92.96 C 65.29,78.33 76.06,63.19 77.09,62.34 C 77.82,61.71 87.52,58.99 96.20,56.95 C 99.60,56.15 100.00,55.93 100.00,54.68 C 100.00,53.32 100.00,53.32 85.88,53.32 C 71.81,53.32 71.81,53.32 68.12,56.27";
document.getElementById("logoPath").setAttribute("d", LOGO_PATH);

const $ = (id) => document.getElementById(id);
let session = null;
let mode = "signin";

const show = (v) =>
  ["login", "home"].forEach((x) => $("v-" + x).classList.toggle("on", x === v));

/* ---- session storage ---- */
const loadSession = async () => (await chrome.storage.local.get("session")).session || null;
const saveSession = (s) => chrome.storage.local.set({ session: s });
const clearSession = () => chrome.storage.local.remove("session");

/* ---- supabase auth (REST) ---- */
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
  if (!res.ok) throw new Error(d.error_description || d.msg || d.error || "Sign in failed");
  const s = d.access_token ? d : d.session;
  if (!s?.access_token) throw new Error("Check your email to confirm, then sign in.");
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    user: d.user || s.user,
    expires_at: Date.now() + (s.expires_in || 3600) * 1000,
  };
}
const fireWelcome = (email) =>
  fetch(`${APP_URL}/api/welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => {});

/* ---- launch the on-page recording bar ---- */
$("start-btn").onclick = async () => {
  const btn = $("start-btn");
  const hint = $("home-hint");
  btn.disabled = true;
  hint.textContent = "Starting…";
  const resp = await chrome.runtime.sendMessage({ type: "START_RECORDING" });
  btn.disabled = false;
  if (resp?.ok) {
    hint.innerHTML = "Recording started — <b>the Tenet bar is on your tab</b>. Stop &amp; read the summary there.";
  } else {
    hint.textContent = resp?.error || "Couldn't start. Open a normal tab that plays audio, then record.";
  }
};

/* ---- login UI ---- */
$("toggle-mode").onclick = () => {
  mode = mode === "signin" ? "signup" : "signin";
  $("login-title").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("login-btn").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("toggle-mode").innerHTML =
    mode === "signup" ? 'Have an account? <u>Sign in</u>' : 'New here? <u>Create an account</u>';
  $("login-err").textContent = "";
};
async function doLogin() {
  const email = $("email").value.trim();
  const password = $("password").value;
  const err = $("login-err");
  const btn = $("login-btn");
  if (!email || !password) return (err.textContent = "Enter email and password.");
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
  $("acct").textContent = session.user?.email || "Account";
  $("acct").hidden = false;
  show("home");
}

/* ---- init ---- */
(async () => {
  session = await loadSession();
  if (session && session.expires_at > Date.now() + 60000) enterApp();
  else {
    if (session) await clearSession();
    session = null;
    show("login");
  }
})();
