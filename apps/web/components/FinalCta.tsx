"use client";

import { useDict } from "@/lib/i18n";
import { CHROME_STORE_URL } from "@/lib/app-url";

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
          <a className="btn btn-primary" href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">{t.cta.addToChrome}</a>
        </div>
      </div>
    </section>
  );
}
