"use client";

import { useDict } from "@/lib/i18n";
import { SIGN_IN_URL } from "@/lib/app-url";

export function FinalCta() {
  const t = useDict();
  return (
    <section className="finalcta">
      <video className="ctabg" autoPlay muted loop playsInline aria-hidden="true" poster="/og/closing-poster.jpg">
        <source src="/video/closing.mp4" type="video/mp4" />
      </video>
      <div className="wrap">
        <h2>
          {t.finalCta.h2.a}
          <em>{t.finalCta.h2.em}</em>
        </h2>
        <p className="sub" style={{ margin: "18px auto 0" }}>
          {t.finalCta.sub}
        </p>
        <div className="hero-cta" style={{ justifyContent: "center" }}>
          <a className="btn btn-primary" href={SIGN_IN_URL}>{t.cta.getStarted}</a>
        </div>
      </div>
    </section>
  );
}
