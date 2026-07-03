// Minimal on-page recording capsule, injected on the meeting tab. Collapsed it's
// just a red pulsing dot + timer (● 0:34) in the corner; the Стоп button is
// revealed on hover so it stays out of the way. On stop the recording is
// processed and auto-saved — the full transcript/summary lives in app.tenet.blog.
(() => {
  if (window.__tenetBar) return; // already injected
  window.__tenetBar = true;

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
    .dot{width:8px;height:8px;border-radius:50%;background:#FF5E5E;flex:none}
    .rec .dot{animation:pulse 1.7s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,94,94,.5)}70%{box-shadow:0 0 0 7px rgba(255,94,94,0)}100%{box-shadow:0 0 0 0 rgba(255,94,94,0)}}
    .done .dot{background:#34C759;animation:none}
    .time{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:#E8E8EA}
    .msg{font-size:12px;color:#C8C8CE;font-weight:500}
    .link{color:#FFB454;font-weight:700;text-decoration:none;cursor:pointer}
    .stop{max-width:0;opacity:0;overflow:hidden;white-space:nowrap;padding:0;margin:0;border:0;background:#FF5E5E;color:#fff;
      border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;transition:max-width .18s,opacity .16s,padding .18s}
    .bar.rec:hover .stop{max-width:92px;opacity:1;padding:5px 11px}
    .hide{display:none!important}
  </style>
  <div class="bar rec" id="bar">
    <span class="dot"></span>
    <span class="time" id="time">0:00</span>
    <span class="msg hide" id="msg"></span>
    <button class="stop" id="stop">■ Стоп</button>
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
      status("Сохраняю…");
      chrome.runtime.sendMessage({ type: "BAR_SAVE", title: document.title });
    }
    if (m.type === "SAVED") {
      if (m.ok) {
        bar.classList.add("done");
        status("").innerHTML = `Сохранено · <a class="link" href="https://app.tenet.blog" target="_blank">Открыть</a>`;
        setTimeout(destroy, 6000);
      } else {
        status("Не удалось сохранить: " + (m.error || ""));
      }
    }
    if (m.type === "FATAL") status(m.text || "Ошибка записи");
  });

  function destroy() {
    clearInterval(timer);
    host.remove();
    window.__tenetBar = false;
  }
  window.__tenetBarDestroy = destroy;
})();
