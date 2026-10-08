"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { NoticeTicker } from "@/components/site/NoticeTicker";
import { CENTER } from "@/lib/center";
import { categoryMeta } from "@/components/site/categories";
import {
  ArrowRightIcon,
  ClockIcon,
  LanguagesIcon,
  MapPinIcon,
  PhoneIcon,
  QuestionIcon,
  RupeeIcon,
  SearchIcon,
  ShieldIcon,
  WhatsAppIcon,
} from "@/components/site/icons";
import type { Tables } from "@/lib/types/database.types";

type Service = Pick<Tables<"services">, "id" | "slug" | "name_en" | "name_ml" | "category" | "fee" | "processing_time">;

const POPULAR_COUNT = 6;

const HOW_IT_WORKS_KEYS = [
  { title: "landing.howItWorksStep1Title", body: "landing.howItWorksStep1Body" },
  { title: "landing.howItWorksStep2Title", body: "landing.howItWorksStep2Body" },
  { title: "landing.howItWorksStep3Title", body: "landing.howItWorksStep3Body" },
] as const;

const WHY_US_KEYS = [
  { title: "landing.whyUsFee", body: "landing.whyUsFeeBody", Icon: RupeeIcon },
  { title: "landing.whyUsBilingual", body: "landing.whyUsBilingualBody", Icon: LanguagesIcon },
  { title: "landing.whyUsTrack", body: "landing.whyUsTrackBody", Icon: SearchIcon },
  { title: "landing.whyUsWhatsapp", body: "landing.whyUsWhatsappBody", Icon: WhatsAppIcon },
] as const;

const FAQ_KEYS = [
  { q: "landing.faqQ1", a: "landing.faqA1" },
  { q: "landing.faqQ2", a: "landing.faqA2" },
  { q: "landing.faqQ3", a: "landing.faqA3" },
  { q: "landing.faqQ4", a: "landing.faqA4" },
  { q: "landing.faqQ5", a: "landing.faqA5" },
] as const;

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-brand-800 sm:text-3xl">{title}</h2>
      <div className="mx-auto mt-3 flex w-24 items-center gap-1">
        <span className="h-1 flex-1 rounded bg-brand-700" />
        <span className="h-1 w-4 rounded bg-accent-500" />
      </div>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-zinc-600">{subtitle}</p>}
    </div>
  );
}

export function LandingContent({ services }: { services: Service[] }) {
  const { t, lang } = useTranslation();
  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE || CENTER.phone;
  const hours = process.env.NEXT_PUBLIC_CENTER_HOURS;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS || CENTER.addressLines.join(", ");
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  const categories = (["e-district", "aadhaar", "other"] as const)
    .map((category) => ({ category, count: services.filter((s) => s.category === category).length }))
    .filter((c) => c.count > 0);

  return (
    <div>
      <HeroCarousel />
      <NoticeTicker />

      {/* Three-column band: about · track · FAQ (mirrors the official portal's layout) */}
      <section className="bg-slate-700 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-6 py-10 sm:px-8">
            <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
              {t("landing.aboutTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-white/85">{t("landing.aboutBody")}</p>
          </div>

          <div className="bg-slate-800/40 px-6 py-10 sm:px-8">
            <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
              {t("landing.trackTitle")}
            </h2>
            <p className="mt-4 text-center text-white/85">{t("landing.trackBody")}</p>
            <form action="/status" className="mt-5 flex flex-wrap gap-2">
              <label htmlFor="quick-track" className="sr-only">
                {t("status.trackingCodeLabel")}
              </label>
              <input
                id="quick-track"
                name="code"
                required
                placeholder="AKS-7F3K"
                className="w-full min-w-40 flex-1 rounded-md border border-white/20 bg-white px-3 py-2.5 uppercase text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
              />
              <button
                type="submit"
                className="inline-flex grow items-center justify-center gap-1.5 rounded-md bg-accent-500 px-4 py-2.5 font-semibold hover:bg-accent-600 sm:grow-0"
              >
                <SearchIcon className="h-4 w-4" />
                {t("status.submit")}
              </button>
            </form>
          </div>

          <div className="px-6 py-10 sm:px-8">
            <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
              {t("landing.faqShort")}
            </h2>
            <p className="mt-4 leading-relaxed text-white/85">{t("landing.faqTeaser")}</p>
            <Link
              href="#faq"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-accent-300 hover:text-accent-200"
            >
              <QuestionIcon className="h-5 w-5" />
              {t("landing.faqTitle")}
            </Link>
          </div>
        </div>
      </section>

      {/* Service categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <SectionHeading title={t("landing.categoriesTitle")} />
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {categories.map(({ category, count }) => {
              const { Icon, tint } = categoryMeta(category);
              return (
                <Link
                  key={category}
                  href={`/services#${category}`}
                  className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-zinc-900">
                      {t(`services.category.${category}`)}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {t("landing.serviceCount", { count })}
                    </span>
                  </span>
                  <ArrowRightIcon className="h-5 w-5 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Popular services */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("landing.servicesTitle")} subtitle={t("landing.servicesSubtitle")} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, POPULAR_COUNT).map((service) => {
            const { Icon, tint } = categoryMeta(service.category);
            return (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-brand-700">
                    {pickLang(lang, service.name_en, service.name_ml)}
                  </h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">₹{service.fee}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {service.processing_time}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link href="/services" className={buttonClasses("primary")}>
            {t("landing.viewAllServices")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading title={t("landing.howItWorksTitle")} />
          <ol className="relative mt-12 grid gap-10 sm:grid-cols-3">
            <div className="absolute left-[16.6%] right-[16.6%] top-7 hidden border-t-2 border-dashed border-brand-200 sm:block" />
            {HOW_IT_WORKS_KEYS.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-xl font-bold text-white ring-8 ring-brand-50">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900">{t(step.title)}</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-600">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("landing.whyUsTitle")} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_US_KEYS.map(({ title, body, Icon }) => (
            <div key={title} className="rounded-xl border-t-4 border-accent-500 bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <Icon className="h-8 w-8 text-brand-700" />
              <h3 className="mt-4 font-semibold text-zinc-900">{t(title)}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t(body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-brand-700 text-white">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 lg:grid-cols-4">
          {[
            { value: `${services.length}+`, label: t("landing.statServices") },
            { value: "2002", label: t("landing.statSince") },
            { value: "EN / മല", label: t("landing.statLanguages") },
            { value: "MPM 353", label: t("landing.statCentre") },
          ].map((s) => (
            <div key={s.label}>
              <dd className="text-3xl font-extrabold text-accent-300">{s.value}</dd>
              <dt className="mt-1 text-sm text-white/80">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Visit us */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-16 sm:px-6">
        <SectionHeading title={t("landing.trustTitle")} />
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <ul className="space-y-4 lg:col-span-2">
            <li className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5">
              <MapPinIcon className="h-6 w-6 shrink-0 text-brand-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("footer.addressLabel")}</p>
                <p className="mt-1 text-zinc-800">{address}</p>
              </div>
            </li>
            {hours && (
              <li className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5">
                <ClockIcon className="h-6 w-6 shrink-0 text-brand-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("footer.hoursLabel")}</p>
                  <p className="mt-1 text-zinc-800">{hours}</p>
                </div>
              </li>
            )}
            <li className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5">
              <PhoneIcon className="h-6 w-6 shrink-0 text-brand-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("footer.phoneLabel")}</p>
                <a href={`tel:${phone}`} className="mt-1 block text-zinc-800 hover:text-brand-700">
                  {phone}
                </a>
              </div>
            </li>
            <li className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5">
              <ShieldIcon className="h-6 w-6 shrink-0 text-brand-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("landing.centreIdLabel")}</p>
                <p className="mt-1 text-zinc-800">
                  {CENTER.name} · CSC {CENTER.cscId}
                </p>
              </div>
            </li>
          </ul>
          <iframe
            src={mapSrc}
            title={t("landing.trustTitle")}
            className="h-80 w-full rounded-xl border border-zinc-200 lg:col-span-3 lg:h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-40 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <SectionHeading title={t("landing.faqTitle")} />
          <div className="mt-10 space-y-3">
            {FAQ_KEYS.map((item) => (
              <details key={item.q} className="group rounded-xl border border-zinc-200 bg-white px-5 py-4 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-900">
                  {t(item.q)}
                  <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-zinc-600">{t(item.a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
