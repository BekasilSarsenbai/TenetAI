// Where the product app lives. Override per-environment with NEXT_PUBLIC_APP_URL
// (e.g. http://localhost:3000 locally, https://app.tenet.app in production).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tenet.app";
export const SIGN_IN_URL = `${APP_URL}/login`;

// Public Chrome Web Store listing (no ?authuser — that's a personal session param).
export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/tenet-%E2%80%94-record-summarize/klopcnnfoiceihmohdlphcflnfifdclp";
