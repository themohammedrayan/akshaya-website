import { cookies } from "next/headers";
import { translate, type Lang } from "./dictionary";

/** Server-component counterpart of useTranslation(), driven by the same lang cookie. */
export async function getServerTranslation() {
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "ml" ? "ml" : "en";
  return { lang, t: (path: string, vars?: Record<string, string | number>) => translate(lang, path, vars) };
}
