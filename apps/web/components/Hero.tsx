"use client";

import { useDict } from "@/lib/i18n";
import { WaitlistForm } from "./WaitlistForm";
import { AppMock } from "./AppMock";

export function Hero() {
  const t = useDict();
  return (
    <header className="hero">
      <video className="voicebg" autoPlay muted loop playsInline aria-hidden="true" poster="/og/hero-poster.jpg">
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      <div className="wrap">
        <h1>
          {t.hero.h1.a}
          <em>{t.hero.h1.em}</em>
        </h1>
        <p className="sub">{t.hero.sub}</p>

        <WaitlistForm id="waitlistTop" />
      </div>

      <div className="wrap">
        <AppMock />
      </div>
    </header>
  );
}
