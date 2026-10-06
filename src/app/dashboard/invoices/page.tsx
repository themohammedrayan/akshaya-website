import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST, formatINR, istRange, isValidDate, todayIST } from "@/lib/billing";
import { getServerTranslation } from "@/lib/i18n/server";
import { InvoiceBadge } from "@/components/dashboard/InvoiceBadge";
import { PlusIcon, PrinterIcon, SearchIcon } from "@/components/dashboard/icons";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const { t } = await getServerTranslation();

  const q = filters.q?.trim() ?? "";
  // No filters at all = today's bills. An emptied date box (date="") = all dates.
  const date = filters.date === undefined && !q ? todayIST() : filters.date;

  let query = supabase
    .from("invoices")
    .select("id, invoice_no, customer_name, customer_phone, status, grand_total, paid_total, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (isValidDate(date)) {
    const [start, end] = istRange(date, date);
    query = query.gte("created_at", start).lt("created_at", end);
  }
  if (filters.status === "cancelled") query = query.eq("status", "cancelled");
  if (filters.status === "issued") query = query.eq("status", "issued");
  if (q) {
    const term = q.replace(/[%,()]/g, "");
    query = query.or(`invoice_no.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
  }

  const { data } = await query;
  // "Balance due" compares two columns, which PostgREST filters can't express.
  const invoices = (data ?? []).filter(
    (inv) => filters.status !== "unpaid" || (inv.status === "issued" && Number(inv.paid_total) < Number(inv.grand_total)),
  );
  const active = invoices.filter((inv) => inv.status === "issued");
  const shownTotal = active.reduce((sum, inv) => sum + Number(inv.grand_total), 0);
  const hasFilters = filters.date !== undefined || !!q || !!filters.status;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t("billing.bills.title")}</h1>
          <p className="text-base text-zinc-500">
            {isValidDate(date) ? `${date} · ` : ""}
            {t("billing.bills.todaySummary", { count: active.length, total: formatINR(shownTotal) })}
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
        >
          <PlusIcon /> {t("billing.nav.newBill")}
        </Link>
      </div>

      <form method="get" className="mt-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("billing.bills.search")}
            className="w-full rounded-xl border border-zinc-300 py-3 pl-10 pr-3 text-base"
          />
        </label>
        <input
          type="date"
          name="date"
          defaultValue={date ?? ""}
          aria-label={t("billing.bills.date")}
          className="rounded-xl border border-zinc-300 px-3 py-3 text-base"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          aria-label={t("billing.bills.status")}
          className="rounded-xl border border-zinc-300 px-3 py-3 text-base"
        >
          <option value="">{t("billing.bills.all")}</option>
          <option value="unpaid">{t("billing.bills.due")}</option>
          <option value="issued">{t("billing.bills.issued")}</option>
          <option value="cancelled">{t("billing.bills.cancelled")}</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="min-h-12 flex-1 rounded-xl bg-brand-700 px-5 text-base font-semibold text-white hover:bg-brand-800">
            {t("billing.bills.find")}
          </button>
          {hasFilters && (
            <Link
              href="/dashboard/invoices"
              className="flex min-h-12 items-center rounded-xl px-3 text-base text-zinc-500 hover:bg-zinc-100"
            >
              {t("billing.bills.clear")}
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 grid gap-3">
        {invoices.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-base text-zinc-500">
            {t("billing.bills.noBills")}
          </p>
        )}
        {invoices.map((inv) => {
          const due = Number(inv.grand_total) - Number(inv.paid_total);
          const cancelled = inv.status === "cancelled";
          return (
            <div key={inv.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <Link href={`/dashboard/invoices/${inv.id}`} className={`min-w-0 flex-1 ${cancelled ? "opacity-60" : ""}`}>
                <p className="truncate text-base font-semibold text-zinc-900">{inv.customer_name}</p>
                <p className="text-sm text-zinc-500">
                  <span className="font-mono">{inv.invoice_no}</span> · {formatDateTimeIST(inv.created_at)}
                  {inv.customer_phone ? ` · ${inv.customer_phone}` : ""}
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`text-lg font-bold text-zinc-900 ${cancelled ? "line-through" : ""}`}>
                  {formatINR(inv.grand_total)}
                </span>
                <InvoiceBadge cancelled={cancelled} due={due} />
              </div>
              <Link
                href={`/dashboard/invoices/${inv.id}/print?auto=1`}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <PrinterIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t("billing.bills.reprint")}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
