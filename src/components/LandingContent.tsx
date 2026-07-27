"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { Tables } from "@/lib/types/database.types";

type Service = Pick<Tables<"services">, "id" | "slug" | "name_en" | "name_ml" | "category" | "fee" | "processing_time">;

export function LandingContent({ services }: { services: Service[] }) {
  const { t, lang } = useTranslation();
  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE;
  const hours = process.env.NEXT_PUBLIC_CENTER_HOURS;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS;

  return (
    <div>
      <section className="bg-emerald-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("landing.title")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-600">{t("landing.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/request" className={buttonClasses("primary")}>
              {t("landing.ctaStart")}
            </Link>
            <WhatsAppButton />
          </div>
          {(address || hours || phone) && (
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-600">
              {address && <div>{address}</div>}
              {hours && <div>{hours}</div>}
              {phone && (
                <a href={`tel:${phone}`} className="hover:text-emerald-700">
                  {phone}
                </a>
              )}
            </dl>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">{t("landing.servicesTitle")}</h2>
        <p className="mt-1 text-zinc-600">{t("landing.servicesSubtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
            >
              <h3 className="font-semibold text-zinc-900">
                {pickLang(lang, service.name_en, service.name_ml)}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                {t("services.fee")}: ₹{service.fee} · {service.processing_time}
              </p>
            </Link>
          ))}
        </div>

        <Link
          href="/services"
          className="mt-8 inline-block font-medium text-emerald-700 hover:underline"
        >
          {t("landing.viewAllServices")} →
        </Link>
      </section>
    </div>
  );
}
