"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PageBanner } from "@/components/site/PageBanner";
import { CheckCircleIcon, ClockIcon, FilePlusIcon, RupeeIcon } from "@/components/site/icons";
import type { Tables } from "@/lib/types/database.types";

type Service = Tables<"services">;
type RequiredDoc = { en: string; ml: string };

export function ServiceDetailContent({ service }: { service: Service }) {
  const { t, lang } = useTranslation();
  const docs = Array.isArray(service.required_docs)
    ? (service.required_docs as unknown as RequiredDoc[])
    : [];
  const name = pickLang(lang, service.name_en, service.name_ml);
  const description = pickLang(lang, service.description_en, service.description_ml);

  return (
    <div>
      <PageBanner
        title={name}
        subtitle={description || undefined}
        crumbs={[
          { href: "/", label: t("nav.home") },
          { href: "/services", label: t("services.pageTitle") },
          { label: name },
        ]}
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {docs.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-800">{t("services.requiredDocs")}</h2>
              <ul className="mt-4 space-y-3">
                {docs.map((doc, i) => (
                  <li key={i} className="flex gap-3 text-zinc-700">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    {pickLang(lang, doc.en, doc.ml)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href="/services"
            className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            ← {t("serviceDetail.back")}
          </Link>
        </div>

        <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-44">
          <dl className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <RupeeIcon />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("services.fee")}</dt>
                <dd className="text-lg font-bold text-zinc-900">₹{service.fee}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                <ClockIcon />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t("services.processingTime")}
                </dt>
                <dd className="text-lg font-bold text-zinc-900">{service.processing_time}</dd>
              </div>
            </div>
          </dl>
          <Link href={`/request?service=${service.slug}`} className={buttonClasses("primary", "mt-6 w-full")}>
            <FilePlusIcon className="h-4 w-4" />
            {t("services.startRequestFor")}
          </Link>
          <WhatsAppButton
            className="mt-3 w-full"
            message={`${t("serviceDetail.whatsappAbout")} ${service.name_en}`}
          />
        </aside>
      </div>
    </div>
  );
}
