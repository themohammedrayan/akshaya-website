"use client";

import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-zinc-100 text-zinc-700",
  docs_verified: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  needs_customer_action: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-200 text-emerald-800",
  cancelled: "bg-zinc-200 text-zinc-500",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700",
      )}
    >
      {t(`statusLabels.${status}`)}
    </span>
  );
}
