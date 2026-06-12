"use client";

import { useEffect, useState } from "react";

function focusWaitlist() {
  if (typeof document === "undefined") return;
  const menu = document.getElementById("mobileMenu");
  menu?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  const inp = document.querySelector<HTMLInputElement>("#waitlistTop input");
  if (inp) setTimeout(() => inp.focus(), 320);
}

export function Nav() {
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
            <span className="dot" /> Tenet
          </div>
          <div className="nav-links">
            <a href="#trace">How it works</a>
          </div>
          <div className="nav-cta">
            <button className="btn btn-primary" onClick={focusWaitlist}>
              Join the waitlist
            </button>
            <button
              id="navToggle"
              className="navtoggle"
              aria-label="Open menu"
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
          How it works
        </a>
        <div className="mm-cta">
          <button className="btn btn-primary" onClick={focusWaitlist}>
            Join the waitlist
          </button>
        </div>
      </div>
    </>
  );
}
