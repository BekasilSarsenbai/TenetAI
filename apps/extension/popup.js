import { APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const popup = $("popup");

/* ---------- current selections ---------- */
let template = "auto";
let customPrompt = "";
let lang = "auto"; // auto | ru | en | kk
let micOn = true;

/* ---------- session ---------- */
const loadSession = async () => (await chrome.storage.local.get("session")).session || null;
const saveSession = (s) => chrome.storage.local.set({ session: s });
const clearSession = () => chrome.storage.local.remove("session");
let session = null;
let mode = "signin"; // signin | signup

/* ---------- supabase auth (REST) — same as the web app ---------- */
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
  if (!res.ok) throw new Error(d.error_description || d.msg || d.error || "Не удалось войти");
  const s = d.access_token ? d : d.session;
  if (!s?.access_token) throw new Error("Проверь почту и подтверди аккаунт, потом войди.");
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

/* ---------- template radio group ---------- */
const tpls = [...document.querySelectorAll(".tpl")];
const customBox = $("custom");
function selectTpl(el) {
  tpls.forEach((t) => {
    const s = t === el;
    t.classList.toggle("sel", s);
    t.setAttribute("aria-checked", s);
    t.tabIndex = s ? 0 : -1;
  });
  template = el.dataset.tpl;
  customBox.classList.toggle("show", el.dataset.custom === "1");
  refreshFade();
}
tpls.forEach((t) => t.addEventListener("click", () => selectTpl(t)));
$("tpls").addEventListener("keydown", (e) => {
  const i = tpls.indexOf(document.activeElement);
  if (i < 0) return;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); const n = tpls[(i + 1) % tpls.length]; n.focus(); selectTpl(n); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); const n = tpls[(i - 1 + tpls.length) % tpls.length]; n.focus(); selectTpl(n); }
});

/* ---------- scroll fade ---------- */
const tplsEl = $("tpls");
const wrap = tplsEl.parentElement;
function refreshFade() {
  const atEnd = tplsEl.scrollTop + tplsEl.clientHeight >= tplsEl.scrollHeight - 2;
  wrap.classList.toggle("at-end", atEnd);
}
tplsEl.addEventListener("scroll", refreshFade);
refreshFade();

/* ---------- language menu ---------- */
const langBtn = $("lang");
const langmenu = $("langmenu");
const langv = $("langv");
langBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = langmenu.classList.toggle("show");
  langBtn.setAttribute("aria-expanded", open);
});
langmenu.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    langmenu.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", x === b));
    langv.textContent = b.dataset.l;
    lang = b.dataset.code;
    langmenu.classList.remove("show");
    langBtn.setAttribute("aria-expanded", "false");
  });
});
document.addEventListener("click", () => {
  langmenu.classList.remove("show");
  langBtn.setAttribute("aria-expanded", "false");
});

/* ---------- mic switch ---------- */
const micBtn = $("mic");
micBtn.addEventListener("click", () => {
  micOn = micBtn.getAttribute("aria-checked") !== "true";
  micBtn.setAttribute("aria-checked", micOn);
  $("micsw").classList.toggle("on", micOn);
});

/* ---------- source detection ---------- */
const BLOCKED = /^(chrome|edge|about|chrome-extension|devtools|view-source):|^https:\/\/chrome\.google\.com\/webstore/;
function appName(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (/meet\.google\./.test(h)) return "Google Meet";
    if (/zoom\.(us|com)/.test(h)) return "Zoom";
    if (/teams\.(microsoft|live)\./.test(h)) return "Microsoft Teams";
    if (/youtube\.|youtu\.be/.test(h)) return "YouTube";
    if (/whereby\.com/.test(h)) return "Whereby";
    if (/meet\.jit\.si/.test(h)) return "Jitsi";
    return h;
  } catch {
    return null;
  }
}
let activeTab = null;
async function detectSource() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  activeTab = tab || null;
  if (!tab || BLOCKED.test(tab.url || "")) {
    setState("micmode");
  } else {
    $("src-name").textContent = appName(tab.url) || tab.title || "эту вкладку";
    setState("ready");
  }
}

/* ---------- start ---------- */
const startBtn = $("start");
const startLabel = () => (popup.dataset.state === "micmode" ? "Начать с микрофона" : "Начать запись");
startBtn.addEventListener("click", async () => {
  const lbl = startBtn.querySelector(".lbl");
  $("err").textContent = "";
  startBtn.disabled = true;
  lbl.textContent = "Запускаю…";

  if (template === "custom") customPrompt = ($("custom-text").value || "").trim();

  // If the mic is on, prompt for permission here (visible page + user gesture),
  // so the offscreen document can reuse the grant. Non-fatal if it fails.
  if (micOn) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {
      /* denied / dismissed — offscreen will fall back to tab-only */
    }
  }

  const resp = await chrome.runtime.sendMessage({
    type: "START_RECORDING",
    opts: { lang, template, customPrompt, mic: micOn, micOnly: popup.dataset.state === "micmode" },
  });

  if (resp?.ok) {
    window.close();
  } else {
    startBtn.disabled = false;
    lbl.textContent = startLabel();
    $("err").textContent = resp?.error || "Не удалось начать. Открой вкладку со звуком и попробуй снова.";
  }
});

/* ---------- state ---------- */
function setState(s) {
  popup.dataset.state = s;
  startBtn.disabled = false;
  startBtn.querySelector(".lbl").textContent = startLabel();
  if (s === "micmode") {
    micOn = true;
    micBtn.setAttribute("aria-checked", "true");
    $("micsw").classList.add("on");
  }
}

/* ---------- login UI ---------- */
$("swap").addEventListener("click", () => {
  mode = mode === "signin" ? "signup" : "signin";
  $("auth-title").textContent = mode === "signup" ? "Создать аккаунт" : "Войди в Tenet";
  $("signin").textContent = mode === "signup" ? "Создать аккаунт" : "Войти";
  $("swap").innerHTML = mode === "signup" ? 'Уже есть аккаунт? <u>Войти</u>' : 'Впервые тут? <u>Создать аккаунт</u>';
  $("auth-err").textContent = "";
});
async function doLogin() {
  const email = $("email").value.trim();
  const password = $("password").value;
  const err = $("auth-err");
  if (!email || !password) { err.textContent = "Введи email и пароль."; return; }
  $("signin").disabled = true;
  err.textContent = "";
  try {
    session = await authRequest(email, password, mode === "signup");
    await saveSession(session);
    if (mode === "signup") fireWelcome(email);
    await detectSource();
  } catch (e) {
    err.textContent = String(e.message || e);
  } finally {
    $("signin").disabled = false;
  }
}
$("signin").addEventListener("click", doLogin);
$("password").addEventListener("keydown", (e) => e.key === "Enter" && doLogin());

/* ---------- settings / gear → open the web app ---------- */
$("gear").addEventListener("click", () => chrome.tabs.create({ url: APP_URL }));

/* ---------- init ---------- */
(async () => {
  session = await loadSession();
  if (session && session.expires_at > Date.now() + 60000) {
    await detectSource();
  } else {
    if (session) await clearSession();
    session = null;
    setState("signedout");
  }
})();
