"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { trackIntakeSubmit } from "@/lib/analytics";
import { submitRequest, type SubmitRequestState } from "@/app/(public)/request/actions";
import { DocumentUpload } from "@/components/DocumentUpload";
import type { Tables } from "@/lib/types/database.types";

type Service = Pick<Tables<"services">, "id" | "slug" | "name_en" | "name_ml" | "required_docs">;
type RequiredDoc = { en: string; ml: string };

const initialState: SubmitRequestState = { status: "idle" };

export function IntakeContent({
  services,
  preselectedSlug,
}: {
  services: Service[];
  preselectedSlug?: string;
}) {
  const { t, lang } = useTranslation();
  const [state, formAction, pending] = useActionState(submitRequest, initialState);
  const [copied, setCopied] = useState(false);

  const preselected = services.find((s) => s.slug === preselectedSlug);
  const [selectedServiceId, setSelectedServiceId] = useState(preselected?.id ?? "");

  useEffect(() => {
    if (state.status === "success" && preselectedSlug) {
      trackIntakeSubmit(preselectedSlug);
    } else if (state.status === "success") {
      trackIntakeSubmit("unknown");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "success") {
    const selectedService = services.find((s) => s.id === selectedServiceId);
    const docs = Array.isArray(selectedService?.required_docs)
      ? (selectedService.required_docs as unknown as RequiredDoc[])
      : [];

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">{t("intake.successTitle")}</h1>
        <p className="mt-2 text-zinc-600">{t("intake.successMessage")}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="rounded-lg bg-brand-50 px-6 py-3 text-2xl font-bold tracking-wide text-brand-800">
            {state.trackingCode}
          </span>
          <button
            type="button"
            className={buttonClasses("secondary")}
            onClick={() => {
              navigator.clipboard.writeText(state.trackingCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? t("intake.copied") : t("intake.copyCode")}
          </button>
        </div>

        {docs.length > 0 && (
          <div className="mt-10 text-left">
            <h2 className="text-sm font-semibold text-zinc-700">{t("intake.uploadTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t("intake.uploadSubtitle")}</p>
            <div className="mt-4 space-y-3">
              {docs.map((doc, i) => (
                <DocumentUpload
                  key={i}
                  requestId={state.requestId}
                  docLabel={doc.en}
                  docLabelDisplay={pickLang(lang, doc.en, doc.ml)}
                />
              ))}
            </div>
          </div>
        )}

        <Link href="/status" className="mt-8 inline-block font-medium text-brand-700 hover:underline">
          {t("intake.viewStatus")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">{t("intake.title")}</h1>
      <p className="mt-2 text-zinc-600">{t("intake.subtitle")}</p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label htmlFor="serviceId" className="block text-sm font-medium text-zinc-700">
            {t("intake.serviceLabel")}
          </label>
          <select
            id="serviceId"
            name="serviceId"
            required
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          >
            <option value="" disabled>
              {t("intake.servicePlaceholder")}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {pickLang(lang, service.name_en, service.name_ml)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-zinc-700">
            {t("intake.nameLabel")}
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            minLength={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-zinc-700">
            {t("intake.phoneLabel")}
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            required
            placeholder="98765 43210"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
          />
        </div>

        {state.status === "error" && (
          <p className="text-sm text-red-600">{t(`intake.${state.message}`)}</p>
        )}

        <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
          {pending ? t("intake.submitting") : t("intake.submit")}
        </button>
      </form>
    </div>
  );
}
