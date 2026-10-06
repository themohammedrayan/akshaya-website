import en from "./en.json";
import ml from "./ml.json";

export type Lang = "en" | "ml";

export type Dictionary = typeof en;

export const dictionaries = { en, ml } satisfies Record<Lang, unknown>;

/** Looks up a dotted key ("billing.nav.newBill"); falls back to the key itself. */
export function translate(lang: Lang, path: string, vars?: Record<string, string | number>): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dictionaries[lang] as Dictionary);

  const text = typeof value === "string" ? value : path;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;
}
