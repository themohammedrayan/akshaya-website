"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import type { Tables } from "@/lib/types/database.types";

type Service = Tables<"services">;
type RequiredDoc = { en: string; ml: string };

export function ServiceDetailContent({ service }: { service: Service }) {
  const { t, lang } = useTranslation();
  const docs = Array.isArray(service.required_docs)
    ? (service.required_docs as unknown as RequiredDoc[])
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/services" className="text-sm font-medium text-brand-700 hover:underline">
        ← {t("serviceDetail.back")}
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-zinc-900">
        {pickLang(lang, service.name_en, service.name_ml)}
      </h1>

      {pickLang(lang, service.description_en, service.description_ml) && (
        <p className="mt-3 text-zinc-600">
          {pickLang(lang, service.description_en, service.description_ml)}
        </p>
      )}

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-zinc-500">{t("services.fee")}</dt>
          <dd className="mt-1 text-lg font-semibold text-zinc-900">₹{service.fee}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">{t("services.processingTime")}</dt>
          <dd className="mt-1 text-lg font-semibold text-zinc-900">{service.processing_time}</dd>
        </div>
      </dl>

      {docs.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-zinc-900">{t("services.requiredDocs")}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-700">
            {docs.map((doc, i) => (
              <li key={i}>{pickLang(lang, doc.en, doc.ml)}</li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/request?service=${service.slug}`}
        className={buttonClasses("primary", "mt-10")}
      >
        {t("services.startRequestFor")}
      </Link>
    </div>
  );
}
