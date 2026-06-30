// Floating Tenet recording bar, injected on the meeting tab. Lives in a Shadow
// DOM so the host page's CSS can't touch it. All recording/processing happens in
// the background + offscreen; this is purely the on-page UI + controls.
(() => {
  if (window.__tenetBar) return; // already injected
  window.__tenetBar = true;

  const LOGO =
    'M 41.30,11.46 C 38.80,15.26 33.87,22.46 30.41,27.45 C 26.89,32.50 23.94,36.81 23.83,37.10 C 23.77,37.32 18.50,38.91 12.14,40.61 C 5.79,42.26 0.52,43.68 0.46,43.79 C 0.35,43.90 0.18,44.47 0.06,45.09 C -0.11,46.23 0.23,46.23 14.07,46.40 C 30.18,46.57 26.83,47.82 40.33,36.42 L 46.12,31.48 L 46.12,18.04 C 46.12,10.61 46.06,4.54 46.00,4.54 C 45.89,4.60 43.79,7.66 41.30,11.46 M 54.11,18.15 C 54.06,33.35 52.53,30.29 65.80,41.24 L 72.21,46.51 L 86.10,46.51 C 98.98,46.51 100.00,46.46 100.00,45.49 C 100.00,44.98 99.77,44.24 99.55,43.96 C 99.32,43.62 95.35,42.43 90.64,41.18 C 85.99,39.99 80.89,38.63 79.35,38.12 C 76.29,37.04 77.20,38.17 64.78,20.14 C 61.60,15.43 58.20,10.55 57.23,9.30 C 56.27,8.00 55.19,6.47 54.80,5.90 C 54.28,5.05 54.11,7.60 54.11,18.15 M 0.06,54.68 C -0.22,56.04 0.00,56.10 11.41,58.93 C 17.81,60.52 23.09,61.88 23.15,61.94 C 23.20,62.05 26.15,66.31 29.61,71.47 C 33.13,76.63 38.23,84.12 41.07,88.14 L 46.12,95.46 L 46.12,81.56 L 46.12,67.61 L 37.33,60.46 L 28.53,53.32 L 14.41,53.32 C 0.29,53.32 0.29,53.32 0.06,54.68 M 68.12,56.27 C 66.08,57.91 62.11,61.20 59.28,63.53 L 54.06,67.78 L 54.06,81.34 C 54.06,94.89 54.06,94.89 55.36,92.96 C 65.29,78.33 76.06,63.19 77.09,62.34 C 77.82,61.71 87.52,58.99 96.20,56.95 C 99.60,56.15 100.00,55.93 100.00,54.68 C 100.00,53.32 100.00,53.32 85.88,53.32 C 71.81,53.32 71.81,53.32 68.12,56.27';

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
    @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
    *{margin:0;padding:0;box-sizing:border-box;font-family:Manrope,system-ui,sans-serif}
    .bar{width:540px;max-width:92vw;background:#0E0E11;border:1px solid rgba(255,255,255,.13);
      border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.3);overflow:hidden;color:#F3F3F4}
    .head{display:flex;align-items:center;gap:11px;padding:12px 13px 12px 15px;cursor:grab}
    .head:active{cursor:grabbing}
    .dot{width:9px;height:9px;border-radius:50%;background:#ff5a52;flex:none}
    .rec .dot{animation:pulse 1.7s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,90,82,.5)}70%{box-shadow:0 0 0 9px rgba(255,90,82,0)}100%{box-shadow:0 0 0 0 rgba(255,90,82,0)}}
    .brand{font-weight:700;font-size:14px}
    .sep{color:#48484F}
    .time{font-family:"JetBrains Mono",monospace;font-size:13px;color:#B8B8BE}
    .sp{flex:1}
    .btn{display:inline-flex;align-items:center;gap:6px;border-radius:9px;font-size:12.5px;font-weight:600;
      padding:7px 12px;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#F3F3F4;white-space:nowrap}
    .btn:hover{background:rgba(255,255,255,.09)}
    .icn{width:30px;height:30px;padding:0;justify-content:center}
    .panel{border-top:1px solid rgba(255,255,255,.07);padding:13px 15px 14px;max-height:340px;overflow:auto;display:none}
    .panel.show{display:block}
    .ptitle{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:#48484F;font-weight:600;margin:2px 0 9px}
    .tx{display:flex;gap:9px;padding:5px 0;font-size:13px}
    .tx .t{font-family:"JetBrains Mono",monospace;font-size:11px;color:#E9B84A;background:rgba(233,184,74,.1);
      border:1px solid rgba(233,184,74,.4);border-radius:5px;padding:1px 6px;height:fit-content;white-space:nowrap}
    .tx s{color:#B8B8BE;text-decoration:none;line-height:1.45}
    .tldr{color:#F3F3F4;font-size:13.5px;line-height:1.55;margin-bottom:6px}
    .muted{color:#7A7A82;font-size:12.5px;line-height:1.5}
    .live{display:inline-flex;align-items:center;gap:6px;color:#7A7A82;font-size:11px;margin-top:6px}
    .foot{display:flex;gap:8px;margin-top:13px}
    .stop{flex:1;background:#ff5a52;color:#fff;border:0;border-radius:10px;padding:11px;font-size:13.5px;font-weight:700;cursor:pointer}
    .stop:hover{filter:brightness(1.07)}
    .save{background:#F3F3F4;color:#0E0E11;border:0;border-radius:10px;padding:11px 16px;font-size:13px;font-weight:700;cursor:pointer}
    .hide{display:none!important}
  </style>
  <div class="bar rec" id="bar">
    <div class="head" id="head">
      <span class="dot"></span>
      <span class="brand">Tenet</span>
      <span class="sep">·</span>
      <span class="time" id="time">00:00</span>
      <span class="sp"></span>
      <span class="btn" id="mark">🔖 Mark</span>
      <span class="btn icn" id="toggle">▾</span>
      <span class="btn icn" id="close" title="Close">✕</span>
    </div>
    <div class="panel" id="panel">
      <div id="recview">
        <div class="ptitle" id="ptitle">Recording</div>
        <div class="muted" id="status">Tenet is capturing this tab. Mark anything important — your transcript &amp; summary are ready when you stop.</div>
        <div class="live" id="liverow"><span class="dot" style="width:5px;height:5px"></span> recording…</div>
        <div class="foot">
          <button class="stop" id="stop">■ Stop &amp; summarize</button>
        </div>
      </div>
      <div id="result" class="hide">
        <div class="ptitle">Summary</div>
        <div class="tldr" id="tldr"></div>
        <div class="ptitle" style="margin-top:12px">Transcript</div>
        <div id="transcript"></div>
        <div class="foot">
          <button class="save" id="save">Save to Tenet</button>
          <button class="stop" id="again" style="flex:0;background:rgba(255,255,255,.05);color:#F3F3F4;border:1px solid rgba(255,255,255,.1)">New</button>
        </div>
        <div class="muted" id="savemsg" style="margin-top:8px"></div>
      </div>
    </div>
  </div>`;

  const $ = (id) => root.getElementById(id);
  const bar = $("bar");
  let startMs = Date.now();
  let timer = setInterval(() => ($("time").textContent = fmt((Date.now() - startMs) / 1000)), 500);

  // expand/collapse
  let open = false;
  const setOpen = (v) => {
    open = v;
    $("panel").classList.toggle("show", v);
    $("toggle").textContent = v ? "▴" : "▾";
  };
  $("toggle").onclick = () => setOpen(!open);
  $("mark").onclick = () => chrome.runtime.sendMessage({ type: "BAR_MARK" });
  $("stop").onclick = () => {
    $("stop").textContent = "Processing…";
    $("stop").disabled = true;
    chrome.runtime.sendMessage({ type: "BAR_STOP" });
  };
  $("close").onclick = () => { chrome.runtime.sendMessage({ type: "BAR_STOP" }); destroy(); };
  $("again").onclick = () => destroy();

  // drag
  (() => {
    let sx, sy, ox, oy, drag = false;
    $("head").addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("btn")) return;
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

  function showResult(transcript, summary) {
    clearInterval(timer);
    bar.classList.remove("rec");
    $("recview").classList.add("hide");
    $("result").classList.remove("hide");
    setOpen(true);
    $("tldr").textContent = (summary && summary.tldr) || "No summary.";
    const tx = $("transcript"); tx.innerHTML = "";
    (transcript || []).forEach((l) => {
      const d = document.createElement("div"); d.className = "tx";
      const t = document.createElement("span"); t.className = "t"; t.textContent = fmt(l.start);
      const s = document.createElement("s"); s.textContent = l.text || "";
      d.append(t, s); tx.appendChild(d);
    });
  }

  chrome.runtime.onMessage.addListener((m) => {
    if (m.target !== "bar") return;
    if (m.type === "STATUS") { $("status").textContent = m.text; }
    if (m.type === "RESULT") showResult(m.transcript, m.summary);
    if (m.type === "SAVED") { $("savemsg").textContent = m.ok ? "Saved ✓ — open it at app.tenet.blog" : ("Couldn't save: " + (m.error || "")); }
    if (m.type === "FATAL") { $("status").textContent = m.text; $("stop").textContent = "Close"; $("stop").disabled = false; $("stop").onclick = destroy; }
  });

  $("save").onclick = () => {
    $("savemsg").textContent = "Saving…";
    chrome.runtime.sendMessage({ type: "BAR_SAVE", title: document.title });
  };

  function destroy() {
    clearInterval(timer);
    host.remove();
    window.__tenetBar = false;
  }
  window.__tenetBarDestroy = destroy;
})();
