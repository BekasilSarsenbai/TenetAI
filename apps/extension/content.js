// Minimal on-page recording capsule, injected on the meeting tab. Collapsed it's
// just a red pulsing dot + timer (● 0:34) in the corner; the Стоп button is
// revealed on hover so it stays out of the way. On stop the recording is
// processed and auto-saved — the full transcript/summary lives in app.tenet.blog.
(() => {
  const LOG = (...a) => { try { console.log("[Tenet/bar]", ...a); } catch {} };
  if (window.__tenetBar) { LOG("bar already present — skip"); return; }
  window.__tenetBar = true;
  LOG("bar injected");

  const fmt = (s) => {
    s = Math.max(0, Math.round(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const host = document.createElement("div");
  host.id = "tenet-bar-host";
  host.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  root.innerHTML = `
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:Manrope,-apple-system,system-ui,"Segoe UI",sans-serif}
    .bar{display:inline-flex;align-items:center;gap:8px;background:rgba(14,14,16,.94);border:1px solid rgba(255,255,255,.12);
      border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.45);padding:7px 12px;color:#F3F3F4;cursor:grab;user-select:none}
    .bar:active{cursor:grabbing}
    .logo{width:16px;height:16px;flex:none}
    .dot{width:8px;height:8px;border-radius:50%;background:#FF5E5E;flex:none}
    .rec .dot{animation:pulse 1.7s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,94,94,.5)}70%{box-shadow:0 0 0 7px rgba(255,94,94,0)}100%{box-shadow:0 0 0 0 rgba(255,94,94,0)}}
    .done .dot{background:#34C759;animation:none}
    .time{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:#E8E8EA}
    .msg{font-size:12px;color:#C8C8CE;font-weight:500}
    .link{color:#FFB454;font-weight:700;text-decoration:none;cursor:pointer}
    .arr{display:inline-flex;align-items:center;color:#FFB454;text-decoration:none;cursor:pointer}
    .arr svg{width:15px;height:15px;display:block}
    .stop{max-width:0;opacity:0;overflow:hidden;white-space:nowrap;padding:0;margin:0;border:0;background:#FF5E5E;color:#fff;
      border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;transition:max-width .18s,opacity .16s,padding .18s}
    .bar.rec:hover .stop{max-width:92px;opacity:1;padding:5px 11px}
    .hide{display:none!important}
  </style>
  <div class="bar rec" id="bar">
    <svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="tg" x1="50" y1="2" x2="50" y2="98" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d3d3d7"/><stop offset="1" stop-color="#9a9aa0"/></linearGradient></defs><path fill="url(#tg)" d="M 41.30,11.46 C 38.80,15.26 33.87,22.46 30.41,27.45 C 26.89,32.50 23.94,36.81 23.83,37.10 C 23.77,37.32 18.50,38.91 12.14,40.61 C 5.79,42.26 0.52,43.68 0.46,43.79 C 0.35,43.90 0.18,44.47 0.06,45.09 C -0.11,46.23 0.23,46.23 14.07,46.40 C 30.18,46.57 26.83,47.82 40.33,36.42 L 46.12,31.48 L 46.12,18.04 C 46.12,10.61 46.06,4.54 46.00,4.54 C 45.89,4.60 43.79,7.66 41.30,11.46 M 54.11,18.15 C 54.06,33.35 52.53,30.29 65.80,41.24 L 72.21,46.51 L 86.10,46.51 C 98.98,46.51 100.00,46.46 100.00,45.49 C 100.00,44.98 99.77,44.24 99.55,43.96 C 99.32,43.62 95.35,42.43 90.64,41.18 C 85.99,39.99 80.89,38.63 79.35,38.12 C 76.29,37.04 77.20,38.17 64.78,20.14 C 61.60,15.43 58.20,10.55 57.23,9.30 C 56.27,8.00 55.19,6.47 54.80,5.90 C 54.28,5.05 54.11,7.60 54.11,18.15 M 0.06,54.68 C -0.22,56.04 0.00,56.10 11.41,58.93 C 17.81,60.52 23.09,61.88 23.15,61.94 C 23.20,62.05 26.15,66.31 29.61,71.47 C 33.13,76.63 38.23,84.12 41.07,88.14 L 46.12,95.46 L 46.12,81.56 L 46.12,67.61 L 37.33,60.46 L 28.53,53.32 L 14.41,53.32 C 0.29,53.32 0.29,53.32 0.06,54.68 M 68.12,56.27 C 66.08,57.91 62.11,61.20 59.28,63.53 L 54.06,67.78 L 54.06,81.34 C 54.06,94.89 54.06,94.89 55.36,92.96 C 65.29,78.33 76.06,63.19 77.09,62.34 C 77.82,61.71 87.52,58.99 96.20,56.95 C 99.60,56.15 100.00,55.93 100.00,54.68 C 100.00,53.32 100.00,53.32 85.88,53.32 C 71.81,53.32 71.81,53.32 68.12,56.27"/></svg>
    <span class="dot"></span>
    <span class="time" id="time">0:00</span>
    <span class="msg hide" id="msg"></span>
    <button class="stop" id="stop">■ Стоп</button>
    <a class="arr hide" id="open" target="_blank" title="Открыть в Tenet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
  </div>`;

  const $ = (id) => root.getElementById(id);
  const bar = $("bar");
  let startMs = Date.now();
  let timer = setInterval(() => ($("time").textContent = fmt((Date.now() - startMs) / 1000)), 500);

  // collapse the timer into a status message (used after stop)
  function status(text) {
    clearInterval(timer);
    bar.classList.remove("rec");
    $("time").classList.add("hide");
    $("stop").classList.add("hide");
    const m = $("msg");
    m.classList.remove("hide");
    m.textContent = text;
    return m;
  }

  $("stop").onclick = (e) => {
    e.stopPropagation();
    status("Обрабатываю…");
    chrome.runtime.sendMessage({ type: "BAR_STOP" });
  };

  // drag (bottom-right anchored → switch to left/top on first move)
  (() => {
    let sx, sy, ox, oy, drag = false;
    bar.addEventListener("mousedown", (e) => {
      if (e.target.id === "stop") return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = host.getBoundingClientRect(); ox = r.left; oy = r.top;
      host.style.bottom = "auto"; host.style.right = "auto";
      host.style.left = ox + "px"; host.style.top = oy + "px";
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      host.style.left = Math.max(8, ox + e.clientX - sx) + "px";
      host.style.top = Math.max(8, oy + e.clientY - sy) + "px";
    });
    window.addEventListener("mouseup", () => (drag = false));
  })();

  chrome.runtime.onMessage.addListener((m) => {
    if (m.target !== "bar") return;
    // Live transcript lines (PARTIAL) are intentionally ignored in minimal mode.
    if (m.type === "STATUS") {
      if (bar.classList.contains("rec")) return;
      status(m.text || "Обрабатываю…");
    }
    if (m.type === "RESULT") {
      LOG("RESULT → saving");
      status("Сохраняю…");
      chrome.runtime.sendMessage({ type: "BAR_SAVE", title: document.title });
    }
    if (m.type === "SAVED") {
      LOG("SAVED", m.ok, m.error || "");
      if (m.ok) {
        bar.classList.add("done");
        status("Сохранено");
        const open = $("open");
        open.href = "https://app.tenet.blog";
        open.classList.remove("hide");
        setTimeout(destroy, 6000);
      } else {
        status("Не удалось сохранить: " + (m.error || ""));
      }
    }
    if (m.type === "FATAL") { LOG("FATAL", m.text); status(m.text || "Ошибка записи"); }
  });

  function destroy() {
    clearInterval(timer);
    host.remove();
    window.__tenetBar = false;
  }
  window.__tenetBarDestroy = destroy;
})();
