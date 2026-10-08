"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { PageBanner } from "@/components/site/PageBanner";
import { categoryMeta } from "@/components/site/categories";
import { ArrowRightIcon, ClockIcon } from "@/components/site/icons";
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
    <div>
      <PageBanner
        title={t("services.pageTitle")}
        subtitle={t("services.pageSubtitle")}
        crumbs={[{ href: "/", label: t("nav.home") }, { label: t("services.pageTitle") }]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Jump links */}
        <div className="flex flex-wrap gap-2">
          {grouped.map(({ category, items }) => (
            <a
              key={category}
              href={`#${category}`}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-brand-300 hover:text-brand-700"
            >
              {t(`services.category.${category}`)} <span className="text-zinc-400">({items.length})</span>
            </a>
          ))}
        </div>

        {grouped.map((group) => {
          const { Icon, tint } = categoryMeta(group.category);
          return (
            <section key={group.category} id={group.category} className="mt-10 scroll-mt-40">
              <h2 className="flex items-center gap-3 border-b border-zinc-200 pb-3 text-xl font-bold text-brand-800">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {t(`services.category.${group.category}`)}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.slug}`}
                    className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  >
                    <h3 className="font-semibold text-zinc-900 group-hover:text-brand-700">
                      {pickLang(lang, service.name_en, service.name_ml)}
                    </h3>
                    <div className="mt-3 flex flex-1 flex-wrap items-end gap-2 text-xs font-medium">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                        {t("services.fee")}: ₹{service.fee}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {service.processing_time}
                      </span>
                      <ArrowRightIcon className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-brand-600" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
