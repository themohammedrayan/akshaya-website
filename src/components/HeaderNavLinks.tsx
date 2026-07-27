"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function HeaderNavLinks() {
  const { t } = useTranslation();

  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-700">
      <Link href="/services" className="hover:text-brand-700">
        {t("nav.services")}
      </Link>
      <Link href="/status" className="hover:text-brand-700">
        {t("nav.checkStatus")}
      </Link>
      <Link
        href="/request"
        className="rounded-lg bg-brand-700 px-3 py-1.5 text-white hover:bg-brand-800"
      >
        {t("nav.startRequest")}
      </Link>
      <Link href="/login" className="text-zinc-500 hover:text-brand-700">
        {t("nav.login")}
      </Link>
    </nav>
  );
}
