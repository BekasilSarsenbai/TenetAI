"use client";

import { useDict } from "@/lib/i18n";

// Visual identity per testimonial (avatar initials, colors, name) stays fixed
// across locales; the quote and role line come from the dictionary by index.
type Visual = { init: string; bg: string; fg?: string; nm: string };

const VISUALS: Visual[] = [
  { init: "MR", bg: "#5BB7BD", nm: "Maya R." },
  { init: "DK", bg: "#8A7DEF", fg: "#fff", nm: "Daniel K." },
  { init: "PN", bg: "#E8A85B", nm: "Priya N." },
  { init: "SO", bg: "#6FBF8F", nm: "Sam O." },
  { init: "LT", bg: "#D98AA6", fg: "#fff", nm: "Lena T." },
  { init: "MW", bg: "#7FA6E8", fg: "#fff", nm: "Marcus W." },
  { init: "AS", bg: "#C9A24B", nm: "Ava S." },
  { init: "TR", bg: "#9F8AE0", fg: "#fff", nm: "Tomás R." },
];

type CardData = Visual & { q: string; hd: string };

function Card({ t, dup }: { t: CardData; dup?: boolean }) {
  return (
    <div className={`tcard${dup ? " dup" : ""}`} aria-hidden={dup || undefined}>
      <p>&quot;{t.q}&quot;</p>
      <div className="who">
        <span className="av2" style={{ background: t.bg, color: t.fg }}>
          {t.init}
        </span>
        <div>
          <div className="nm">{t.nm}</div>
          <div className="hd">{t.hd}</div>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const t = useDict();
  const items: CardData[] = VISUALS.map((v, i) => ({
    ...v,
    q: t.testimonials.items[i].q,
    hd: t.testimonials.items[i].hd,
  }));

  return (
    <section className="section hair">
      <div className="wrap">
        <h2>
          {t.testimonials.h2.a}
          <em>{t.testimonials.h2.em}</em>
        </h2>
        <p className="lead">{t.testimonials.lead}</p>
      </div>
      <div className="loved-marquee">
        <div className="loved-track">
          {items.map((it) => (
            <Card key={it.init} t={it} />
          ))}
          {items.map((it) => (
            <Card key={`dup-${it.init}`} t={it} dup />
          ))}
        </div>
      </div>
    </section>
  );
}
