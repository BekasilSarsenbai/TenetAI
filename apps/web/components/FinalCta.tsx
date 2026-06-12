import { WaitlistForm } from "./WaitlistForm";

export function FinalCta() {
  return (
    <section className="finalcta">
      <video className="ctabg" autoPlay muted loop playsInline aria-hidden="true" poster="/og/closing-poster.jpg">
        <source src="/video/closing.mp4" type="video/mp4" />
      </video>
      <div className="wrap">
        <h2>
          Notes you can finally <em>trust.</em>
        </h2>
        <p className="sub" style={{ margin: "18px auto 0" }}>
          Join the waitlist, be first to record, summarize and verify with Tenet.
        </p>
        <WaitlistForm id="waitlistBottom" />
      </div>
    </section>
  );
}
