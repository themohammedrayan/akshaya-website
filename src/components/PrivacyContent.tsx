"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { CENTER } from "@/lib/center";

// Linked from the footer and given to Meta as the WhatsApp app's privacy
// policy URL (required to publish the app). Keep it in plain words.
const SECTIONS = ["collect", "use", "share", "keep", "rights", "contact"] as const;

export function PrivacyContent() {
  const { t } = useTranslation();
  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE || CENTER.phone;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">{t("privacy.title")}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t("privacy.updated")}</p>
      <p className="mt-6 text-zinc-700">{t("privacy.intro")}</p>

      {SECTIONS.map((key) => (
        <section key={key} className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900">{t(`privacy.${key}Title`)}</h2>
          <p className="mt-2 whitespace-pre-line text-zinc-700">{t(`privacy.${key}Body`, { phone })}</p>
        </section>
      ))}
    </div>
  );
}
