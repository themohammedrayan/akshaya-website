"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CENTER } from "@/lib/center";
import { OFFICIAL_LINKS } from "@/lib/site";
import { ClockIcon, ExternalLinkIcon, MapPinIcon, PhoneIcon } from "@/components/site/icons";
import akshayaMark from "../../public/akshaya-mark.png";

const QUICK_LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/services", key: "nav.services" },
  { href: "/request", key: "nav.startRequest" },
  { href: "/status", key: "nav.checkStatus" },
  { href: "/#faq", key: "landing.faqTitle" },
  { href: "/login", key: "nav.login" },
] as const;

export function Footer() {
  const { t } = useTranslation();

  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE || CENTER.phone;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS || CENTER.addressLines.join(", ");
  const hours = process.env.NEXT_PUBLIC_CENTER_HOURS;

  return (
    <footer className="mt-16 bg-brand-900 text-sm text-white/75">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white p-1.5">
              <Image src={akshayaMark} alt="" className="h-10 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-bold text-white" lang="ml">
                അക്ഷയ
              </span>
              <span className="block text-xs text-white/70" lang="ml">
                അവസരങ്ങളുടെ ജാലകം
              </span>
            </span>
          </div>
          <p className="mt-4">{t("footer.about")}</p>
          <p className="mt-3 text-xs text-white/60">
            {CENTER.name} · CSC ID {CENTER.cscId}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">{t("footer.quickLinks")}</h2>
          <ul className="mt-4 space-y-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-accent-300">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">{t("footer.officialPortals")}</h2>
          <ul className="mt-4 space-y-2">
            {OFFICIAL_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-accent-300"
                >
                  {l.label}
                  <ExternalLinkIcon className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">{t("footer.contactTitle")}</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex gap-2.5">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <span>{address}</span>
            </li>
            <li className="flex gap-2.5">
              <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <a href={`tel:${phone}`} className="hover:text-accent-300">
                {phone}
              </a>
            </li>
            {hours && (
              <li className="flex gap-2.5">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span>{hours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50 sm:px-6">
          &copy; {new Date().getFullYear()} {CENTER.name}. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
