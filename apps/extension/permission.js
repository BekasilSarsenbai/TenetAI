// Stable microphone-permission grant page. Opened in a tab (unlike the popup,
// a tab doesn't close when the mic prompt appears), so the grant is reliable.
// Once granted for this extension origin, the offscreen recorder can use the
// mic without prompting again.
const btn = document.getElementById("grant");
const status = document.getElementById("status");

function markGranted(msg) {
  document.body.dataset.state = "ok";
  btn.textContent = "Готово ✓";
  btn.disabled = true;
  status.textContent = msg;
  try { chrome.storage.local.set({ micGranted: true }); } catch {}
}

async function grant() {
  status.textContent = "";
  btn.disabled = true;
  btn.textContent = "Запрашиваю…";
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    markGranted("Микрофон разрешён. Закрой эту вкладку и вернись к записи — твой голос теперь пишется.");
    setTimeout(() => { try { window.close(); } catch {} }, 2400);
  } catch {
    document.body.dataset.state = "denied";
    btn.disabled = false;
    btn.textContent = "Разрешить микрофон";
    status.textContent =
      "Доступ не выдан. Нажми ещё раз, либо разреши микрофон для расширения через значок 🔒 слева от адреса → «Микрофон» → «Разрешить».";
  }
}

btn.addEventListener("click", grant);

// If it's already granted, say so up front.
if (navigator.permissions && navigator.permissions.query) {
  navigator.permissions
    .query({ name: "microphone" })
    .then((p) => {
      if (p.state === "granted") markGranted("Микрофон уже разрешён — можешь закрыть вкладку.");
    })
    .catch(() => {});
}
