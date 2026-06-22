"use client";

import { useDict } from "@/lib/i18n";

export function Roles() {
  const t = useDict();
  return (
    <section className="section left tight">
      <div className="wrap">
        <h2>
          {t.roles.h2.a}
          <em>{t.roles.h2.em}</em>
          {t.roles.h2.b}
        </h2>
        <div className="rolelist">
          {t.roles.items.map((r) => (
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
