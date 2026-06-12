type Theme = { name: string; lit: number; total: number; count: string };

const THEMES: Theme[] = [
  { name: "Onboarding drop-off", lit: 8, total: 10, count: "8 sources" },
  { name: "Lost context between syncs", lit: 5, total: 10, count: "5 sources" },
  { name: "Pricing felt fair after value", lit: 4, total: 10, count: "4 sources" },
];

export function Synthesis() {
  return (
    <section className="section left" id="synthesis">
      <div className="wrap">
        <div className="split asym">
          <div>
            <h2>
              See the pattern across <em>every</em> conversation.
            </h2>
            <p className="lead">
              One meeting is a note. Twelve are a signal. Tenet connects a whole series and surfaces the themes that
              keep coming up, each one a click from the exact quote that said it.
            </p>
            <div className="keypts">
              <div className="keypt">
                <span className="d" />
                <span>
                  <b>Recurring themes, found for you.</b> Patterns across interviews and calls, not one transcript at a
                  time.
                </span>
              </div>
              <div className="keypt">
                <span className="d" />
                <span>
                  <b>Always traceable.</b> Every theme links back to the moments that formed it.
                </span>
              </div>
            </div>
          </div>
          <div className="glowwrap">
            <div className="themepanel">
              <div className="tp-head">
                <span className="tp-title">Recurring themes</span>
                <span className="tp-meta">12 conversations</span>
              </div>
              <div className="tp-list">
                {THEMES.map((t, i) => (
                  <div className={`tp-row${i === 0 ? " on" : ""}`} key={t.name}>
                    <div>
                      <span className="tp-name">{t.name}</span>
                      <div className="tp-src">
                        {Array.from({ length: t.total }).map((_, j) => (
                          <i key={j} className={j < t.lit ? "lit" : undefined} />
                        ))}
                        <span className="tp-count">{t.count}</span>
                      </div>
                    </div>
                    <span className="tp-jump">View ↗</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
