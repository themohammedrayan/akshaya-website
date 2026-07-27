"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { Tables } from "@/lib/types/database.types";

type Service = Pick<Tables<"services">, "id" | "slug" | "name_en" | "name_ml" | "category" | "fee" | "processing_time">;

const HOW_IT_WORKS_KEYS = [
  { title: "landing.howItWorksStep1Title", body: "landing.howItWorksStep1Body" },
  { title: "landing.howItWorksStep2Title", body: "landing.howItWorksStep2Body" },
  { title: "landing.howItWorksStep3Title", body: "landing.howItWorksStep3Body" },
] as const;

const WHY_US_KEYS = [
  { title: "landing.whyUsFee", body: "landing.whyUsFeeBody" },
  { title: "landing.whyUsBilingual", body: "landing.whyUsBilingualBody" },
  { title: "landing.whyUsTrack", body: "landing.whyUsTrackBody" },
  { title: "landing.whyUsWhatsapp", body: "landing.whyUsWhatsappBody" },
] as const;

const FAQ_KEYS = [
  { q: "landing.faqQ1", a: "landing.faqA1" },
  { q: "landing.faqQ2", a: "landing.faqA2" },
  { q: "landing.faqQ3", a: "landing.faqA3" },
  { q: "landing.faqQ4", a: "landing.faqA4" },
  { q: "landing.faqQ5", a: "landing.faqA5" },
] as const;

export function LandingContent({ services }: { services: Service[] }) {
  const { t, lang } = useTranslation();
  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE;
  const hours = process.env.NEXT_PUBLIC_CENTER_HOURS;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS;
  const mapSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-50">
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
          {phone && (
            <a href={`tel:${phone}`} className="mt-6 inline-block text-sm text-zinc-600 hover:text-brand-700">
              {phone}
            </a>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">{t("landing.howItWorksTitle")}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS_KEYS.map((step, i) => (
            <div key={step.title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-3 font-semibold text-zinc-900">{t(step.title)}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t(step.body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">{t("landing.servicesTitle")}</h2>
        <p className="mt-1 text-zinc-600">{t("landing.servicesSubtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-brand-400 hover:bg-brand-50"
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
          className="mt-8 inline-block font-medium text-brand-700 hover:underline"
        >
          {t("landing.viewAllServices")} →
        </Link>
      </section>

      {/* Why choose us */}
      <section className="bg-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-zinc-900">{t("landing.whyUsTitle")}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US_KEYS.map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="font-semibold text-zinc-900">{t(item.title)}</h3>
                <p className="mt-1 text-sm text-zinc-600">{t(item.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar: location, hours, phone, map */}
      {(address || hours || phone) && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-zinc-900">{t("landing.trustTitle")}</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <dl className="space-y-4 text-sm text-zinc-700">
              {address && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t("footer.addressLabel")}
                  </dt>
                  <dd className="mt-1">{address}</dd>
                </div>
              )}
              {hours && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t("footer.hoursLabel")}
                  </dt>
                  <dd className="mt-1">{hours}</dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t("footer.phoneLabel")}
                  </dt>
                  <dd className="mt-1">
                    <a href={`tel:${phone}`} className="hover:text-brand-700">
                      {phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {mapSrc && (
              <iframe
                src={mapSrc}
                title={t("landing.trustTitle")}
                className="h-64 w-full rounded-xl border border-zinc-200"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">{t("landing.faqTitle")}</h2>
        <div className="mt-6 divide-y divide-zinc-200 border-t border-b border-zinc-200">
          {FAQ_KEYS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-900">
                {t(item.q)}
                <span className="ml-4 text-zinc-400 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-zinc-600">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Sticky mobile WhatsApp CTA */}
      <div className="fixed bottom-4 right-4 z-40 sm:hidden">
        <WhatsAppButton className="shadow-lg" />
      </div>
    </div>
  );
}
