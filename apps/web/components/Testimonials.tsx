type T = { q: string; init: string; bg: string; fg?: string; nm: string; hd: string };

const ITEMS: T[] = [
  { q: "I click the claim, hear the exact moment it was said, and move on, the first notetaker I never have to double-check.", init: "MR", bg: "#5BB7BD", nm: "Maya R.", hd: "UX Researcher · early access" },
  { q: "The cross-conversation view surfaced a theme across 14 interviews I would have completely missed.", init: "DK", bg: "#8A7DEF", fg: "#fff", nm: "Daniel K.", hd: "Product Lead · early access" },
  { q: "It bills itself on insight, not memory. Every client call is sourced and reusable across engagements.", init: "PN", bg: "#E8A85B", nm: "Priya N.", hd: "Independent Consultant · early access" },
  { q: "Onboarding research used to take a day of re-listening. Now the source is one click under every point.", init: "SO", bg: "#6FBF8F", nm: "Sam O.", hd: "Founder · early access" },
  { q: "No bot awkwardly joining the call changed how candid our user interviews feel.", init: "LT", bg: "#D98AA6", fg: "#fff", nm: "Lena T.", hd: "Design Lead · early access" },
  { q: "We make roadmap calls on these notes. Verifying the exact quote killed the second-guessing.", init: "MW", bg: "#7FA6E8", fg: "#fff", nm: "Marcus W.", hd: "Head of Product · early access" },
  { q: "Tagging themes across a study used to be manual. Tenet shows the pattern and links the evidence.", init: "AS", bg: "#C9A24B", nm: "Ava S.", hd: "UX Researcher · early access" },
  { q: "I bill on insight now, not on hours of rewatching recordings.", init: "TR", bg: "#9F8AE0", fg: "#fff", nm: "Tomás R.", hd: "Solo Consultant · early access" },
];

function Card({ t, dup }: { t: T; dup?: boolean }) {
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
  return (
    <section className="section hair">
      <div className="wrap">
        <h2>
          The people who can&apos;t afford to be <em>wrong.</em>
        </h2>
        <p className="lead">Early researchers, founders and consultants already trust what Tenet hands back.</p>
      </div>
      <div className="loved-marquee">
        <div className="loved-track">
          {ITEMS.map((t) => (
            <Card key={t.init} t={t} />
          ))}
          {ITEMS.map((t) => (
            <Card key={`dup-${t.init}`} t={t} dup />
          ))}
        </div>
      </div>
    </section>
  );
}
