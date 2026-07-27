"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import type { Tables } from "@/lib/types/database.types";

type Service = Pick<
  Tables<"services">,
  "id" | "slug" | "name_en" | "name_ml" | "category" | "fee" | "processing_time"
>;

const CATEGORY_ORDER = ["e-district", "aadhaar", "other"] as const;

export function ServicesListContent({ services }: { services: Service[] }) {
  const { t, lang } = useTranslation();

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: services.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">{t("services.pageTitle")}</h1>
      <p className="mt-2 max-w-xl text-zinc-600">{t("services.pageSubtitle")}</p>

      {grouped.map((group) => (
        <section key={group.category} className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t(`services.category.${group.category}`)}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <h3 className="font-semibold text-zinc-900">
                  {pickLang(lang, service.name_en, service.name_ml)}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {t("services.fee")}: ₹{service.fee}
                </p>
                <p className="text-sm text-zinc-500">
                  {t("services.processingTime")}: {service.processing_time}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
