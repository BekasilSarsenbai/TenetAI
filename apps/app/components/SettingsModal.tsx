"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/types";
import {
  CalIcon,
  CardIcon,
  ClockCircleIcon,
  Link,
  Mic,
  ShieldIcon,
  SquareIcon,
  UserIcon,
} from "./icons";

type Section = "account" | "connections" | "recording" | "privacy" | "plan";

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "Account", icon: <UserIcon /> },
  { id: "connections", label: "Connections", icon: <Link /> },
  { id: "recording", label: "Recording", icon: <Mic /> },
  { id: "privacy", label: "Privacy & data", icon: <ShieldIcon /> },
  { id: "plan", label: "Plan & usage", icon: <CardIcon /> },
];

export function SettingsModal({
  open,
  onClose,
  onToast,
  user,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
  user: AppUser;
}) {
  const [sec, setSec] = useState<Section>("account");
  const [sw1, setSw1] = useState(true);
  const [sw2, setSw2] = useState(true);
  const [recLang, setRecLang] = useState("auto");
  const router = useRouter();

  useEffect(() => {
    const v = localStorage.getItem("tenet.recLang");
    if (v) setRecLang(v);
  }, []);

  function changeLang(v: string) {
    setRecLang(v);
    localStorage.setItem("tenet.recLang", v);
    onToast("Recognition language saved.");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/login");
  }

  if (!open) return null;

  return (
    <div
      className="modal show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet sheet-lg">
        <div className="set-head">
          <h3>Settings</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="set-grid">
          <nav className="set-nav">
            {NAV.map((n) => (
              <button
                key={n.id}
                className={sec === n.id ? "on" : ""}
                onClick={() => setSec(n.id)}
              >
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div className="set-panel">

            {sec === "account" && (
              <section className="set-sec on">
                <h4>Account</h4>
                <p className="desc">Your profile and sign-in.</p>
                <div className="acct-prof">
                  <span className="acct-av">{user.name[0].toUpperCase()}</span>
                  <div>
                    <div className="nm">{user.name}</div>
                    <div className="em">{user.email}</div>
                    <span className="pchip2">Early access · Free</span>
                  </div>
                </div>
                <button className="signout" onClick={handleSignOut}>
                  Sign out
                </button>
                <div className="acct-foot">
                  <button onClick={() => onToast("Preparing your data export…")}>Export my data</button>
                  {" · "}
                  <button onClick={() => onToast("Account deletion — confirmation would appear here.")}>
                    Delete account
                  </button>
                </div>
              </section>
            )}

            {sec === "connections" && (
              <section className="set-sec on">
                <h4>Connections</h4>
                <p className="desc">What Tenet is linked to.</p>
                <div className="conn">
                  <span className="cic"><CalIcon /></span>
                  <div className="ct">
                    <b>Google</b>
                    <span>Calendar · read-only · beka@narxoz.kz</span>
                  </div>
                  <span className="badge ok">Connected</span>
                </div>
                <div className="conn">
                  <span className="cic"><ClockCircleIcon /></span>
                  <div className="ct">
                    <b>Chrome extension</b>
                    <span>Captures Google Meet audio without a bot</span>
                  </div>
                  <button className="badge off" onClick={() => onToast("Opening Chrome Web Store…")}>
                    Install
                  </button>
                </div>
                <div className="conn">
                  <span className="cic"><SquareIcon /></span>
                  <div className="ct">
                    <b>Export to Notion</b>
                    <span>Send notes straight to your workspace</span>
                  </div>
                  <button className="badge off" onClick={() => onToast("Notion export is coming soon.")}>
                    Connect
                  </button>
                </div>
              </section>
            )}

            {sec === "recording" && (
              <section className="set-sec on">
                <h4>Recording</h4>
                <p className="desc">How Tenet captures and writes your sessions.</p>
                <div className="srow">
                  <div className="si">
                    <b>Recognition language</b>
                    <span>Picking a language sharpens accuracy over auto-detect.</span>
                  </div>
                  <select className="sel" value={recLang} onChange={(e) => changeLang(e.target.value)}>
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                    <option value="kk">Қазақша</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="srow">
                  <div className="si">
                    <b>Show a recording banner</b>
                    <span>Let others on the call see that you&apos;re capturing.</span>
                  </div>
                  <button
                    className={`sw${sw1 ? " on" : ""}`}
                    onClick={() => setSw1((v) => !v)}
                  />
                </div>
                <div className="srow">
                  <div className="si">
                    <b>Auto-start from calendar</b>
                    <span>Begin notes when a scheduled meeting starts.</span>
                  </div>
                  <button
                    className={`sw${sw2 ? " on" : ""}`}
                    onClick={() => setSw2((v) => !v)}
                  />
                </div>
                <div className="srow">
                  <div className="si">
                    <b>Default note template</b>
                    <span>Sets the sections of new notes.</span>
                  </div>
                  <select className="sel">
                    <option>User interview</option>
                    <option>1:1</option>
                    <option>Team sync</option>
                    <option>Sales call</option>
                    <option>Plain notes</option>
                  </select>
                </div>
              </section>
            )}

            {sec === "privacy" && (
              <section className="set-sec on">
                <h4>Privacy &amp; data</h4>
                <p className="desc">
                  Recordings, transcripts and notes stay in your account. Yours to export or delete anytime.
                </p>
                <div className="srow">
                  <div className="si">
                    <b>Keep recordings for</b>
                    <span>Transcripts and notes are kept regardless.</span>
                  </div>
                  <select className="sel">
                    <option>Forever</option>
                    <option>90 days</option>
                    <option>30 days</option>
                    <option>Delete after processing</option>
                  </select>
                </div>
                <div className="srow">
                  <div className="si">
                    <b>Export my data</b>
                    <span>Download every meeting, transcript and note.</span>
                  </div>
                  <button className="badge off" onClick={() => onToast("Preparing your data export…")}>
                    Export
                  </button>
                </div>
                <div className="srow">
                  <div className="si">
                    <b>Delete account</b>
                    <span>Permanently removes everything. Can&apos;t be undone.</span>
                  </div>
                  <button
                    className="badge off"
                    style={{ color: "#ff928c", borderColor: "rgba(229,72,77,.4)" }}
                    onClick={() => onToast("Account deletion — confirmation would appear here.")}
                  >
                    Delete
                  </button>
                </div>
              </section>
            )}

            {sec === "plan" && (
              <section className="set-sec on">
                <h4>Plan &amp; usage</h4>
                <p className="desc">You&apos;re on the early-access plan — free while we&apos;re in beta.</p>
                <div className="acct-prof" style={{ marginTop: 4 }}>
                  <span className="pchip2" style={{ marginTop: 0 }}>Early access · Free</span>
                </div>
                <div className="usage">
                  <div className="ut">
                    <span className="l">Transcription this month</span>
                    <span className="v">183 / 600 min</span>
                  </div>
                  <div className="ubar"><div className="ufill" /></div>
                  <div className="un">Resets on the 1st.</div>
                </div>
                <button
                  className="signout"
                  style={{ borderColor: "var(--amber-line)", color: "var(--amber)" }}
                  onClick={() => onToast("Added to the Pro waitlist!")}
                >
                  Join the waitlist for Pro
                </button>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
