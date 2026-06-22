"use client";

import { useEffect, useState } from "react";
import { useDict } from "@/lib/i18n";
import { SIGN_IN_URL } from "@/lib/app-url";
import { LangToggle } from "./LangToggle";
import { Logo } from "./Logo";

export function Nav() {
  const t = useDict();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap row">
          <div className="brand">
            <Logo size={20} /> Tenet
          </div>
          <div className="nav-links">
            <a href="#trace">{t.nav.howItWorks}</a>
            <a href="#pricing">{t.nav.pricing}</a>
          </div>
          <div className="nav-cta">
            <LangToggle />
            <a className="btn btn-ghost nav-signin" href={SIGN_IN_URL}>{t.cta.signIn}</a>
            <a className="btn btn-primary" href={SIGN_IN_URL}>{t.cta.getStarted}</a>
            <button
              id="navToggle"
              className="navtoggle"
              aria-label={t.nav.openMenu}
              onClick={() => {
                setMenuOpen((o) => !o);
                document.getElementById("mobileMenu")?.classList.toggle("open");
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      <div className={`mobilemenu${menuOpen ? " open" : ""}`} id="mobileMenu">
        <a href="#trace" onClick={() => setMenuOpen(false)}>
          {t.nav.howItWorks}
        </a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>
          {t.nav.pricing}
        </a>
        <div className="mm-cta">
          <LangToggle />
          <a className="btn btn-primary" href={SIGN_IN_URL}>{t.cta.getStarted}</a>
        </div>
      </div>
    </>
  );
}
