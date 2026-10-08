import { cookies } from "next/headers";
import { langFromCookie, translate } from "./dictionary";

/** Server-component counterpart of useTranslation(), driven by the same lang cookie. */
export async function getServerTranslation() {
  const cookieStore = await cookies();
  const lang = langFromCookie(cookieStore.get("lang")?.value);
  return { lang, t: (path: string, vars?: Record<string, string | number>) => translate(lang, path, vars) };
}
