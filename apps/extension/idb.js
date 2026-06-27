// Tiny IndexedDB blob store. Offscreen and side panel share the same extension
// origin, so a Blob written here from one can be read from the other — the clean
// way to hand off a recording without base64-ing megabytes through messaging.

const DB = "tenet-rec";
const STORE = "blobs";

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function putBlob(key, blob) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(key) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const g = tx.objectStore(STORE).get(key);
    g.onsuccess = () => res(g.result || null);
    g.onerror = () => rej(g.error);
  });
}
