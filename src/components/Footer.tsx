"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS;
  const hours = process.env.NEXT_PUBLIC_CENTER_HOURS;

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-zinc-600 sm:px-6">
        <h2 className="font-semibold text-zinc-900">{t("footer.contactTitle")}</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          {address && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                {t("footer.addressLabel")}
              </dt>
              <dd>{address}</dd>
            </div>
          )}
          {phone && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                {t("footer.phoneLabel")}
              </dt>
              <dd>
                <a href={`tel:${phone}`} className="hover:text-brand-700">
                  {phone}
                </a>
              </dd>
            </div>
          )}
          {hours && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                {t("footer.hoursLabel")}
              </dt>
              <dd>{hours}</dd>
            </div>
          )}
        </dl>
        <p className="mt-6 text-xs text-zinc-400">
          &copy; {new Date().getFullYear()} Akshaya e-Center. {t("footer.rights")} ·{" "}
          <Link href="/privacy" className="hover:text-brand-700">
            {t("footer.privacy")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
