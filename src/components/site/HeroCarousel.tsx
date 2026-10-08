"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { HERO_SLIDES } from "@/lib/site";
import { buttonClasses } from "@/components/ui/button-styles";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  CertificateIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FingerprintIcon,
} from "@/components/site/icons";
import akshayaLogo from "../../../public/akshaya-logo.png";

const INTERVAL_MS = 6000;

function SlideArt({ slideKey }: { slideKey: (typeof HERO_SLIDES)[number]["key"] }) {
  if (slideKey === "welcome") {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-2xl ring-4 ring-white/20">
        <Image src={akshayaLogo} alt="" className="h-40 w-auto sm:h-52" preload />
      </div>
    );
  }
  const Icon = slideKey === "aadhaar" ? FingerprintIcon : CertificateIcon;
  return (
    <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 sm:h-60 sm:w-60">
      <div className="absolute inset-4 rounded-full border-2 border-dashed border-accent-300/50" />
      <Icon className="h-24 w-24 text-white sm:h-28 sm:w-28" />
    </div>
  );
}

export function HeroCarousel() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = HERO_SLIDES.length;

  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("hero.label")}
      className="relative overflow-hidden bg-brand-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative min-h-[460px] sm:min-h-[440px]">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={clsx(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            {/* Background: photo if configured, else brand gradient with a dotted "circuit" texture */}
            {slide.image ? (
              <>
                <Image src={slide.image} alt="" fill sizes="100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/70 to-brand-900/20" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(115deg,var(--color-brand-800)_0%,#123a63_45%,#0b5f6b_75%,#0d7a5f_100%)]">
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:22px_22px]" />
                <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
              </div>
            )}

            <div className="relative mx-auto flex h-full max-w-7xl flex-col items-start justify-center gap-8 px-6 py-12 sm:px-16 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl text-white">
                <p className="text-lg font-semibold italic text-accent-300 sm:text-xl">
                  {t(`hero.${slide.key}Kicker`)}
                </p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">
                  {t(`hero.${slide.key}Title`)}
                </h2>
                <div className="mt-4 h-0.5 w-40 bg-gradient-to-r from-accent-400 to-transparent" />
                <p className="mt-4 text-base text-white/85 sm:text-lg">{t(`hero.${slide.key}Body`)}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={slide.cta.href}
                    className={buttonClasses("primary", "bg-accent-500 hover:bg-accent-600")}
                  >
                    {t(slide.cta.labelKey)}
                  </Link>
                  {slide.key === "welcome" && <WhatsAppButton />}
                </div>
              </div>
              <div className="hidden shrink-0 md:block">
                <SlideArt slideKey={slide.key} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label={t("hero.prev")}
        className="absolute left-2 top-1/2 hidden -translate-y-1/2 md:left-16 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 sm:block"
      >
        <ChevronLeftIcon className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label={t("hero.next")}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 sm:block"
      >
        <ChevronRightIcon className="h-7 w-7" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            onClick={() => go(i)}
            aria-label={`${i + 1} / ${count}`}
            aria-current={i === index}
            className={clsx(
              "h-2.5 rounded-full transition-all",
              i === index ? "w-8 bg-accent-400" : "w-2.5 bg-white/50 hover:bg-white/80",
            )}
          />
        ))}
      </div>
    </section>
  );
}
