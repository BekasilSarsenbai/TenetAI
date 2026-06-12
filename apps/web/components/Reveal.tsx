"use client";

import { useEffect } from "react";

export function Reveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (
      [
        [".rolelist", 4],
        [".keypts", 1],
      ] as [string, number][]
    ).forEach(([sel]) => {
      document.querySelectorAll(sel).forEach((c) => {
        Array.from(c.children).forEach((ch, i) => {
          ch.classList.add("reveal");
          (ch as HTMLElement).style.transitionDelay = Math.min(i, 6) * 70 + "ms";
        });
      });
    });

    document
      .querySelectorAll(
        ".section h2,.section .lead,.glowwrap,.bigquote,.finalcta h2,.finalcta .sub,.finalcta .waitlist",
      )
      .forEach((el) => el.classList.add("reveal"));

    const targets = document.querySelectorAll(".reveal");
    if (reduce) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
