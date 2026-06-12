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
      </div>

      <div className="wrap">
        <GranolaMock />
      </div>
    </header>
  );
}
