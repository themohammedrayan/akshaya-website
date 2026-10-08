"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { NOTICE_KEYS } from "@/lib/site";
import { MegaphoneIcon } from "@/components/site/icons";

export function NoticeTicker() {
  const { t } = useTranslation();
  const items = NOTICE_KEYS.map((k) => t(`notices.${k}`));

  return (
    <div className="flex items-stretch border-b border-brand-800 bg-brand-700 text-sm text-white">
      <div className="flex shrink-0 items-center gap-2 bg-accent-500 px-4 py-2.5 font-semibold">
        <MegaphoneIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t("notices.title")}</span>
      </div>
      <div className="relative flex-1 overflow-hidden py-2.5">
        {/* Content is duplicated so the -50% marquee loops seamlessly. */}
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap pl-6 hover:[animation-play-state:paused]">
          {[...items, ...items].map((text, i) => (
            <span key={i} aria-hidden={i >= items.length} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-300" />
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
