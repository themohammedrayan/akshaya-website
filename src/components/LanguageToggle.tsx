"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import clsx from "clsx";

export function LanguageToggle() {
  const { lang, setLang, t } = useTranslation();
  const router = useRouter();

  return (
    <div className="inline-flex rounded-full border border-zinc-300 p-0.5 text-sm">
      {(["en", "ml"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            setLang(option);
            // Re-render server components (e.g. dashboard labels) in the new language.
            router.refresh();
          }}
          aria-pressed={lang === option}
          className={clsx(
            "rounded-full px-3 py-1 font-medium transition-colors",
            lang === option ? "bg-brand-700 text-white" : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          {option === "en" ? t("language.english") : t("language.malayalam")}
        </button>
      ))}
    </div>
  );
}
