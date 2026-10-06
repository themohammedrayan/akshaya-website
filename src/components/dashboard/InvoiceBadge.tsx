"use client";

import { formatINR } from "@/lib/billing";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function InvoiceBadge({ cancelled, due }: { cancelled: boolean; due: number }) {
  const { t } = useTranslation();
  if (cancelled)
    return (
      <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
        {t("billing.bills.cancelledBadge")}
      </span>
    );
  if (due > 0)
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        {t("billing.bills.dueAmount", { amount: formatINR(due) })}
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      {t("billing.bills.paid")}
    </span>
  );
}
