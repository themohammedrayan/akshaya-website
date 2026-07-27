"use client";

import { useActionState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickLang } from "@/lib/i18n/pickLang";
import { buttonClasses } from "@/components/ui/button-styles";
import { StatusBadge } from "@/components/StatusBadge";
import { lookupStatus, type LookupStatusState } from "@/app/(public)/status/actions";

const initialState: LookupStatusState = { status: "idle" };

export function StatusContent() {
  const { t, lang } = useTranslation();
  const [state, formAction, pending] = useActionState(lookupStatus, initialState);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">{t("status.title")}</h1>
      <p className="mt-2 text-zinc-600">{t("status.subtitle")}</p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label htmlFor="trackingCode" className="block text-sm font-medium text-zinc-700">
            {t("status.trackingCodeLabel")}
          </label>
          <input
            id="trackingCode"
            name="trackingCode"
            type="text"
            required
            placeholder="AKS-7F3K"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
            {t("status.phoneLabel")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="98765 43210"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {(state.status === "error" || state.status === "not_found") && (
          <p className="text-sm text-red-600">
            {state.status === "not_found" ? t("status.notFound") : t(`status.${state.message}`)}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
          {pending ? t("intake.submitting") : t("status.submit")}
        </button>
      </form>

      {state.status === "found" && (
        <div className="mt-10 rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">{state.request.tracking_code}</p>
              <h2 className="font-semibold text-zinc-900">
                {pickLang(lang, state.request.service_name_en, state.request.service_name_ml)}
              </h2>
            </div>
            <StatusBadge status={state.request.status} />
          </div>

          {state.request.history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-700">{t("status.historyTitle")}</h3>
              <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4">
                {state.request.history.map((entry, i) => (
                  <li key={i}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-zinc-400">
                        {new Date(entry.changed_at).toLocaleString(lang === "ml" ? "ml-IN" : "en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                    {entry.note && <p className="mt-1 text-sm text-zinc-600">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
