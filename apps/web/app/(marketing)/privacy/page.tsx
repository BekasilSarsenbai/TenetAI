import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Tenet",
  description:
    "How Tenet handles your data across the web app and the Chrome extension.",
};

const UPDATED = "6 July 2026";

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "64px 24px 96px",
        color: "var(--ink, #f3f3f4)",
        lineHeight: 1.7,
      }}
    >
      <a
        href="/"
        style={{ color: "var(--muted, #7a7a82)", textDecoration: "none", fontSize: 14 }}
      >
        ← Tenet
      </a>
      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: "18px 0 6px" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "var(--muted, #7a7a82)", fontSize: 14, marginBottom: 36 }}>
        Last updated {UPDATED}
      </p>

      <Section title="Who this covers">
        This policy applies to the Tenet web app (<b>tenet.blog</b>,{" "}
        <b>app.tenet.blog</b>) and the Tenet Chrome extension. Tenet records calls
        you choose to record, transcribes them, and creates AI summaries — with
        every key point linked to the moment it was said.
      </Section>

      <Section title="What we collect">
        <ul style={ul}>
          <li>
            <b>Account data</b> — your email address and an encrypted password (or a
            Google sign-in), used to authenticate you.
          </li>
          <li>
            <b>Recordings</b> — audio you explicitly capture by pressing “Record”.
            The browser extension only captures a tab’s audio while you are
            actively recording, and never in the background.
          </li>
          <li>
            <b>Transcripts &amp; summaries</b> — text derived from your recordings.
          </li>
        </ul>
        We do not collect browsing history, and we do not track you across sites.
      </Section>

      <Section title="How we use it">
        Your recordings are sent to our transcription and summarization providers
        to produce a transcript and summary, which are then saved to your account
        so you can revisit them. We use your email only to operate your account and
        send essential messages (e.g. a welcome email). We do not sell your data or
        use it for advertising.
      </Section>

      <Section title="Where your data lives (subprocessors)">
        <ul style={ul}>
          <li><b>Supabase</b> — authentication, database, and private file storage for your recordings and notes.</li>
          <li><b>Deepgram &amp; Groq</b> — speech-to-text transcription (including speaker labels) and AI summarization of the audio/text you submit.</li>
          <li><b>Vercel</b> — application hosting.</li>
          <li><b>Resend</b> — transactional email (e.g. the welcome email).</li>
        </ul>
        Your saved data is isolated to your account using row-level security — only
        you can access your recordings and notes.
      </Section>

      <Section title="Retention & deletion">
        Recordings, transcripts, and summaries are kept in your account until you
        delete them. Deleting a session removes its transcript, summary, and audio
        file. To delete your account and all associated data, email us at the
        address below and we will remove it.
      </Section>

      <Section title="Browser extension permissions">
        <ul style={ul}>
          <li><b>tabCapture</b> — to record the current tab’s audio, only while you are recording.</li>
          <li><b>activeTab</b> &amp; <b>scripting</b> — to show the on-page recording controls on the tab you choose to record.</li>
          <li><b>offscreen</b> — to run the audio recorder.</li>
          <li><b>storage</b> — to keep you signed in and hold a finished recording safely until it finishes uploading.</li>
        </ul>
        The extension communicates only with Tenet’s own services (app.tenet.blog
        and our Supabase project).
      </Section>

      <Section title="Your rights">
        You can access, export, or delete your data at any time from the app, or by
        contacting us. If you are in the EEA/UK, you have rights under GDPR
        including access, correction, deletion, and portability.
      </Section>

      <Section title="Contact">
        Questions or deletion requests:{" "}
        <a href="mailto:hello@tenet.blog" style={{ color: "var(--amber, #e9b84a)" }}>
          hello@tenet.blog
        </a>
        .
      </Section>
    </main>
  );
}

const ul: React.CSSProperties = { margin: "8px 0", paddingLeft: 20 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div style={{ color: "var(--soft, #b8b8be)", fontSize: 15 }}>{children}</div>
    </section>
  );
}
