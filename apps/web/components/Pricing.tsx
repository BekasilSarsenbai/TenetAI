"use client";

import { useState } from "react";
import { useDict } from "@/lib/i18n";
import { SIGN_IN_URL } from "@/lib/app-url";

// Prices are locale-independent, so they live here (not in the dictionary).
// Annual = 10x the monthly rate (≈2 months free); shown as the effective /mo.
const PRICE = {
  free: { monthly: "$0", annual: "$0" },
  pro: { monthly: "$8", annual: "$6.67" },
  team: { monthly: "$16", annual: "$13" },
} as const;

const ORDER = ["free", "pro", "team"] as const;

export function Pricing() {
  const t = useDict();
  const p = t.pricing;
  const [annual, setAnnual] = useState(true);

  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <h2>
          {p.h2.a}
          <em>{p.h2.em}</em>
          {p.h2.b}
        </h2>
        <p className="lead pricing-sub">{p.sub}</p>

        <div className="bill-wrap">
          <div className="bill" role="tablist" aria-label="Billing period">
            <button
              type="button"
              role="tab"
              aria-selected={!annual}
              className={`bill-opt${annual ? "" : " on"}`}
              onClick={() => setAnnual(false)}
            >
              {p.monthly}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={annual}
              className={`bill-opt${annual ? " on" : ""}`}
              onClick={() => setAnnual(true)}
            >
              {p.annual}
            </button>
          </div>
        </div>

        <div className="pricing">
          {ORDER.map((id) => {
            const plan = p.plans[id];
            const isFree = id === "free";
            const popular = id === "pro";
            const team = id === "team";
            const price = annual ? PRICE[id].annual : PRICE[id].monthly;
            const per = team ? p.perSeat : p.perMonth;

            return (
              <div className={`plan${popular ? " popular" : ""}`} key={id}>
                {popular && <span className="plan-badge">{p.plans.pro.badge}</span>}
                <div className="pn">{plan.name}</div>
                <div className="price">
                  {price}
                  {!isFree && <span className="per">{per}</span>}
                </div>
                <div className="note">{plan.note}</div>
                <a className={`btn ${popular ? "btn-primary" : "btn-soft"}`} href={SIGN_IN_URL}>
                  {plan.cta}
                </a>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}><span className="tick" />{f}</li>
                  ))}
                </ul>
                {!isFree && annual && <div className="fine">{p.billedAnnually}</div>}
                {popular && <div className="fine">{p.founding}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
