"use client";

import { useDict } from "@/lib/i18n";
import { SIGN_IN_URL } from "@/lib/app-url";

const ORDER = ["free", "pro", "team"] as const;

export function Pricing() {
  const t = useDict();
  const p = t.pricing;

  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <h2>
          {p.h2.a}
          <em>{p.h2.em}</em>
          {p.h2.b}
        </h2>
        <p className="lead pricing-sub">{p.earlyAccess}</p>

        <div className="pricing">
          {ORDER.map((id) => {
            const plan = p.plans[id];
            const isFree = id === "free";
            const popular = id === "pro";

            return (
              <div
                className={`plan${popular ? " popular" : ""}${isFree ? "" : " soon"}`}
                key={id}
              >
                {!isFree && <span className="plan-badge soon-badge">{p.comingSoon}</span>}
                <div className="pn">{plan.name}</div>
                <div className="price">
                  {isFree ? (
                    <>
                      $0<span className="per">{p.perMonth}</span>
                    </>
                  ) : (
                    <span className="soon-price">{p.soon}</span>
                  )}
                </div>
                <div className="note">{plan.note}</div>
                {isFree ? (
                  <a className="btn btn-primary" href={SIGN_IN_URL}>
                    {plan.cta}
                  </a>
                ) : (
                  <span className="btn btn-soft btn-disabled" aria-disabled="true">
                    {p.comingSoon}
                  </span>
                )}
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className="tick" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
