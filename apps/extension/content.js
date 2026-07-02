// Minimal on-page recording bar, injected on the meeting tab. Just a compact
// pill: ● Tenet · timer · Стоп. On stop the recording is processed and
// auto-saved to the account — the full transcript/summary lives in the web app
// (app.tenet.blog). Live transcript / in-bar summary are intentionally omitted
// for now (to be added back later).
(() => {
  if (window.__tenetBar) return; // already injected
  window.__tenetBar = true;

  const fmt = (s) => {
    s = Math.max(0, Math.round(s || 0));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const host = document.createElement("div");
  host.id = "tenet-bar-host";
  host.style.cssText =
    "position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  root.innerHTML = `
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:Manrope,-apple-system,system-ui,"Segoe UI",sans-serif}
    .bar{display:flex;align-items:center;gap:10px;background:#0E0E10;border:1px solid rgba(255,255,255,.13);
      border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.3);padding:10px 12px;color:#F3F3F4;cursor:grab}
    .bar:active{cursor:grabbing}
    .dot{width:9px;height:9px;border-radius:50%;background:#FF5E5E;flex:none}
    .rec .dot{animation:pulse 1.7s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,94,94,.5)}70%{box-shadow:0 0 0 8px rgba(255,94,94,0)}100%{box-shadow:0 0 0 0 rgba(255,94,94,0)}}
    .done .dot{background:#34C759;animation:none}
    .brand{font-weight:700;font-size:13.5px}
    .sep{color:#48484F}
    .time{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:13px;color:#B8B8BE;min-width:42px}
    .msg{font-size:12.5px;color:#B8B8BE;font-weight:500}
    .sp{flex:1;min-width:6px}
    .stop{background:#FF5E5E;color:#fff;border:0;border-radius:9px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
    .stop:hover{filter:brightness(1.07)}
    .stop:disabled{background:rgba(255,255,255,.09);color:#7A7A82;cursor:default}
    .link{color:#FFB454;font-weight:700;text-decoration:none;cursor:pointer}
    .x{width:26px;height:26px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);
      color:#F3F3F4;cursor:pointer;display:grid;place-items:center;font-size:12px;flex:none}
    .x:hover{background:rgba(255,255,255,.09)}
    .hide{display:none!important}
  </style>
  <div class="bar rec" id="bar">
    <span class="dot"></span>
    <span class="brand">Tenet</span>
    <span class="sep" id="sep">·</span>
    <span class="time" id="time">00:00</span>
    <span class="msg hide" id="msg"></span>
    <span class="sp"></span>
    <button class="stop" id="stop">■ Стоп</button>
    <span class="x" id="close" title="Закрыть">✕</span>
  </div>`;

  const $ = (id) => root.getElementById(id);
  const bar = $("bar");
  let startMs = Date.now();
  let timer = setInterval(() => ($("time").textContent = fmt((Date.now() - startMs) / 1000)), 500);

  // show a single status line, hiding the timer / stop
  function status(text) {
    clearInterval(timer);
    $("sep").classList.add("hide");
    $("time").classList.add("hide");
    $("stop").classList.add("hide");
    const m = $("msg");
    m.classList.remove("hide");
    m.textContent = text;
    return m;
  }

  $("stop").onclick = () => {
    bar.classList.remove("rec");
    $("stop").disabled = true;
    $("stop").textContent = "Обрабатываю…";
    chrome.runtime.sendMessage({ type: "BAR_STOP" });
  };
  $("close").onclick = () => { chrome.runtime.sendMessage({ type: "BAR_STOP" }); destroy(); };

  // drag anywhere on the bar (except the buttons)
  (() => {
    let sx, sy, ox, oy, drag = false;
    bar.addEventListener("mousedown", (e) => {
      if (e.target.id === "stop" || e.target.id === "close") return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = host.getBoundingClientRect(); ox = r.left; oy = r.top;
      host.style.transform = "none"; host.style.left = ox + "px"; host.style.top = oy + "px";
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      host.style.left = ox + e.clientX - sx + "px";
      host.style.top = Math.max(8, oy + e.clientY - sy) + "px";
    });
    window.addEventListener("mouseup", () => (drag = false));
  })();

  chrome.runtime.onMessage.addListener((m) => {
    if (m.target !== "bar") return;
    // Live transcript lines (PARTIAL) are intentionally ignored in minimal mode.
    if (m.type === "STATUS") {
      if (bar.classList.contains("rec")) return; // ignore while still recording
      status(m.text || "Обрабатываю…");
    }
    if (m.type === "RESULT") {
      // Auto-save; the transcript + summary are viewed in the web app.
      status("Сохраняю…");
      chrome.runtime.sendMessage({ type: "BAR_SAVE", title: document.title });
    }
    if (m.type === "SAVED") {
      if (m.ok) {
        bar.classList.add("done");
        const el = status("");
        el.innerHTML = `Сохранено · <a class="link" href="https://app.tenet.blog" target="_blank">Открыть</a>`;
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
