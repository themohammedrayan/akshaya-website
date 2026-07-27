import type { Lang } from "./LanguageProvider";

/** Picks the right column for bilingual DB content (e.g. name_en/name_ml). */
export function pickLang(lang: Lang, en: string, ml: string): string {
  return lang === "ml" && ml ? ml : en;
}
