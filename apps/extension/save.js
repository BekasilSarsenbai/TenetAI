// Durable saving: upload the recording to Supabase; if that fails (offline or
// server hiccup), queue it in IndexedDB and retry later — so a finished
// recording is NEVER lost. flushPending() is called on browser start, when the
// popup opens, and when a new recording begins.
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, LOG, getFreshSession } from "./config.js";

const DB_NAME = "tenet";
const STORE = "pending";

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) {
        r.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbPut(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(item);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
async function idbAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function idbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// Upload audio (if any) + insert the meeting row. Returns { ok, error }.
export async function uploadMeeting(item, session) {
  const s = session || (await getFreshSession());
  if (!s?.access_token) return { ok: false, error: "no session" };
  try {
    let audio_path = item.audio_path || null;
    // Upload audio only if we still have the blob and haven't uploaded before.
    if (!audio_path && item.blob?.size) {
      audio_path = `${item.user_id}/${item.id}.webm`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${audio_path}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${s.access_token}`,
          "Content-Type": "audio/webm",
        },
        body: item.blob,
      });
      LOG("save: audio upload", up.status);
      if (!up.ok) audio_path = null; // keep the row even if audio failed
    }
    const row = {
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      who: "You",
      dur_sec: item.dur_sec,
      audio_path,
      audio_mime: audio_path ? "audio/webm" : null,
      transcript: item.transcript,
      summary: item.summary,
    };
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    LOG("save: meetings insert", ins.status);
    if (!ins.ok) return { ok: false, error: (await ins.text()).slice(0, 120) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Try to save now; on any failure, queue for automatic retry later.
// Returns { ok, queued, error }.
export async function saveOrQueue(item) {
  const r = await uploadMeeting(item);
  if (r.ok) return { ok: true, queued: false };
  try {
    await idbPut(item);
    LOG("save queued for retry", item.id, r.error);
    return { ok: false, queued: true, error: r.error };
  } catch (e) {
    return { ok: false, queued: false, error: String(e?.message || e) };
  }
}

// Retry every queued save. Safe to call often; no-op when nothing is pending.
let flushing = false;
export async function flushPending() {
  if (flushing) return 0;
  flushing = true;
  try {
    const items = await idbAll();
    if (!items.length) return 0;
    const s = await getFreshSession();
    if (!s?.access_token) return 0;
    let n = 0;
    for (const item of items) {
      const r = await uploadMeeting(item, s);
      if (r.ok) { await idbDelete(item.id); n++; }
    }
    if (n) LOG("flushed", n, "pending save(s)");
    return n;
  } catch (e) {
    LOG("flush error", String(e?.message || e));
    return 0;
  } finally {
    flushing = false;
  }
}

export async function pendingCount() {
  try { return (await idbAll()).length; } catch { return 0; }
}
