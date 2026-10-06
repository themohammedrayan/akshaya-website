import { formatINR } from "@/lib/billing";

export function InvoiceBadge({ cancelled, due }: { cancelled: boolean; due: number }) {
  if (cancelled) return <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">Cancelled</span>;
  if (due > 0)
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Due {formatINR(due)}</span>;
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Paid</span>;
}
