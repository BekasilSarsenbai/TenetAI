"use client";

import { useDict, useLocale } from "@/lib/i18n";

// Compact RU/EN switch. Reuses the existing .btn .btn-soft styling so it sits
// in the nav without any new CSS. Shows the language you'll switch TO.
export function LangToggle() {
  const { locale, toggle } = useLocale();
  const t = useDict();
  const target = locale === "en" ? "RU" : "EN";

  return (
    <button
      type="button"
      className="btn btn-soft"
      onClick={toggle}
      aria-label={t.nav.switchLanguage}
      title={t.nav.switchLanguage}
    >
      {target}
    </button>
  );
}
