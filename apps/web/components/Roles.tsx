const ROLES = [
  {
    rl: "Product teams",
    p: "Turn every customer and team call into decisions you can trace back to exactly what was said.",
  },
  {
    rl: "UX researchers",
    p: "Run a dozen interviews and watch the recurring themes surface on their own, each a click from the exact quote.",
  },
  {
    rl: "Founders",
    p: "Investor, customer and hiring calls captured and summarized. Trust the recap instead of rewatching.",
  },
  {
    rl: "Consultants",
    p: "Bill on insight, not memory. Every client conversation captured, sourced, and reusable across engagements.",
  },
];

export function Roles() {
  return (
    <section className="section left tight">
      <div className="wrap">
        <h2>
          Built for people who <em>reuse</em> what was said.
        </h2>
        <div className="rolelist">
          {ROLES.map((r) => (
            <div className="roleitem" key={r.rl}>
              <span className="rl">{r.rl}</span>
              <p>{r.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
