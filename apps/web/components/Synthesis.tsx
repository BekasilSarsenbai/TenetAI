"use client";

import { useDict } from "@/lib/i18n";

// Fill levels for the source-strength dots stay fixed; the labels are localized.
const FILL = [
  { lit: 8, total: 10 },
  { lit: 5, total: 10 },
  { lit: 4, total: 10 },
];

export function Synthesis() {
  const t = useDict();
  return (
    <section className="section left" id="synthesis">
      <div className="wrap">
        <div className="split asym">
          <div>
            <h2>
              {t.synthesis.h2.a}
              <em>{t.synthesis.h2.em}</em>
              {t.synthesis.h2.b}
            </h2>
            <p className="lead">{t.synthesis.lead}</p>
            <div className="keypts">
              {t.synthesis.keypts.map((k) => (
                <div className="keypt" key={k.b}>
                  <span className="d" />
                  <span>
                    <b>{k.b}</b>
                    {k.rest}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="glowwrap">
            <div className="themepanel">
              <div className="tp-head">
                <span className="tp-title">{t.synthesis.panelTitle}</span>
                <span className="tp-meta">{t.synthesis.conversations}</span>
              </div>
              <div className="tp-list">
                {t.synthesis.themes.map((theme, i) => {
                  const f = FILL[i];
                  return (
                    <div className={`tp-row${i === 0 ? " on" : ""}`} key={theme.name}>
                      <div>
                        <span className="tp-name">{theme.name}</span>
                        <div className="tp-src">
                          {Array.from({ length: f.total }).map((_, j) => (
                            <i key={j} className={j < f.lit ? "lit" : undefined} />
                          ))}
                          <span className="tp-count">{theme.count}</span>
                        </div>
                      </div>
                      <span className="tp-jump">{t.synthesis.view}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
