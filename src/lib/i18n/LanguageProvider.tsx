"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import en from "./en.json";
import ml from "./ml.json";

export type Lang = "en" | "ml";

const dictionaries = { en, ml } satisfies Record<Lang, unknown>;

type Dictionary = typeof en;

function getPath(dict: Dictionary, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);

  return typeof value === "string" ? value : path;
}

export type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (path: string) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.cookie = `lang=${next}; path=/; max-age=31536000`;
  }, []);

  const t = useCallback(
    (path: string) => getPath(dictionaries[lang] as Dictionary, path),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
