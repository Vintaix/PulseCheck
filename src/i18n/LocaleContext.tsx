"use client";
import { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { nl } from "./messages/nl";
import { en } from "./messages/en";
import { fr } from "./messages/fr";

type Locale = "nl" | "en" | "fr";
type Messages = typeof nl;

const dictionaries: Record<Locale, Messages> = { nl, en, fr };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof Messages) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("nl");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("locale") as Locale | null) : null;
    if (stored && ["nl", "en", "fr"].includes(stored)) {
      setLocale(stored);
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale] || dictionaries.nl;
    return {
      locale,
      setLocale: (l: Locale) => {
        setLocale(l);
        if (typeof window !== "undefined") {
          localStorage.setItem("locale", l);
        }
      },
      t: (key) => dict[key] ?? (key as string),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}


