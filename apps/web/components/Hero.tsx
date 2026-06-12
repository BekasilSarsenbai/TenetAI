import { WaitlistForm } from "./WaitlistForm";
import { GranolaMock } from "./GranolaMock";

export function Hero() {
  return (
    <header className="hero">
      <video className="voicebg" autoPlay muted loop playsInline aria-hidden="true" poster="/og/hero-poster.jpg">
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      <div className="wrap">
        <h1>
          Notes you can finally <em>trust.</em>
        </h1>
        <p className="sub">
          Tenet records, transcribes and summarizes every meeting, then links each point back to the exact second it
          was said.
        </p>

        <WaitlistForm id="waitlistTop" note="Be first when Tenet opens up. One launch email, no spam." />

        <div className="trust">
          <span className="lbl">Works with</span>
          <div className="logos">
            <span className="logo">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.2l4.4-2.5A1 1 0 0 1 20 7.6v8.8a1 1 0 0 1-1.6.9L14 14.8V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span className="wm">Google Meet</span>
            </span>
            <span className="logo">
              <span className="wm zoom">zoom</span>
            </span>
            <span className="logo">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
              <span className="wm">Microsoft</span>
            </span>
            <span className="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" strokeWidth="1.5" />
                <path d="M8.5 16V8l7 8V8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="wm">Notion</span>
            </span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <GranolaMock />
      </div>
    </header>
  );
}
