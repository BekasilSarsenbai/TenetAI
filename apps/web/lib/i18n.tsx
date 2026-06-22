"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  type Dict,
  type Locale,
  getDictionary,
} from "./dictionaries";

const STORAGE_KEY = "tenet.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "ru";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // SSR + first paint render in the default locale; we hydrate the stored
  // choice on mount. Keeps the provider server-renderable with no flash for
  // first-time visitors (the common case).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored) && stored !== locale) setLocaleState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const setLocale = (next: Locale) => {
      setLocaleState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode / storage disabled — choice just won't persist */
      }
    };
    return {
      locale,
      setLocale,
      toggle: () => setLocale(locale === "en" ? "ru" : "en"),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function useDict(): Dict {
  const { locale } = useLocale();
  return getDictionary(locale);
}
