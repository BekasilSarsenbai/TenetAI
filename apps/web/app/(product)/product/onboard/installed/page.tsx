import { redirect } from "next/navigation";
import Link from "next/link";
import { ExtensionBridge } from "@/components/ExtensionBridge";

// Post-install onboarding (the extension opens this right after install).
// Signing in happens on the site (middleware redirects to /login when signed
// out); once here, ExtensionBridge hands the session to the extension — the
// user never types a password inside the popup.
export default async function InstalledPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.startsWith("https://")) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg, #0B0B0D)", color: "var(--ink, #F3F3F4)", display: "grid", placeItems: "center", padding: 24 }}>
      <ExtensionBridge />
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".14em", color: "var(--muted, #9B9BA4)", marginBottom: 14 }}>TENET</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>You&apos;re in — one last step</h1>
        <p style={{ color: "var(--soft, #C7C7CE)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 26 }}>
          Your account is now connected to the extension automatically. Pin it so it&apos;s always one click away:
        </p>

        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14, marginBottom: 30 }}>
          {[
            ["1", "Click the 🧩 puzzle icon in the Chrome toolbar (top right)"],
            ["2", "Find Tenet and click the 📌 pin icon"],
            ["3", "Open your meeting tab, click ✦ Tenet → Start recording. Hang up — the note opens itself."],
          ].map(([n, t]) => (
            <li key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--raise, #17171B)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: "15px 17px" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--amber, #E9B84A)", color: "#111", fontWeight: 800, fontSize: 13, display: "grid", placeItems: "center", flex: "none" }}>{n}</span>
              <span style={{ fontSize: 14, color: "var(--ink, #F3F3F4)", lineHeight: 1.55 }}>{t}</span>
            </li>
          ))}
        </ol>

        <Link
          href="/"
          style={{ display: "block", textAlign: "center", background: "var(--amber, #E9B84A)", color: "#111", borderRadius: 12, padding: "13px 16px", fontSize: 14, fontWeight: 800, textDecoration: "none" }}
        >
          Open my notes →
        </Link>
      </div>
    </main>
  );
}
