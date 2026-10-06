import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST, formatINR, istRange, isValidDate } from "@/lib/billing";
import { InvoiceBadge } from "@/components/dashboard/InvoiceBadge";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("id, invoice_no, customer_name, customer_phone, status, grand_total, paid_total, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (isValidDate(filters.date)) {
    const [start, end] = istRange(filters.date, filters.date);
    query = query.gte("created_at", start).lt("created_at", end);
  }
  if (filters.status === "cancelled") query = query.eq("status", "cancelled");
  if (filters.status === "issued") query = query.eq("status", "issued");

  const q = filters.q?.trim();
  if (q) {
    const term = q.replace(/[%,()]/g, "");
    query = query.or(`invoice_no.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
  }

  const { data } = await query;
  // "Unpaid" compares two columns, which PostgREST filters can't express.
  const invoices = (data ?? []).filter(
    (inv) => filters.status !== "unpaid" || (inv.status === "issued" && Number(inv.paid_total) < Number(inv.grand_total)),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + New invoice
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Invoice no., name or phone"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input type="date" name="date" defaultValue={filters.date ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={filters.status ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="unpaid">Balance due</option>
          <option value="issued">Issued</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Filter
        </button>
        {(filters.q || filters.date || filters.status) && (
          <Link href="/dashboard/invoices" className="self-center text-sm text-zinc-500 hover:text-brand-700">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 grid gap-3">
        {invoices.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            No invoices match these filters.
          </p>
        )}
        {invoices.map((inv) => {
          const due = Number(inv.grand_total) - Number(inv.paid_total);
          const cancelled = inv.status === "cancelled";
          return (
            <Link
              key={inv.id}
              href={`/dashboard/invoices/${inv.id}`}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand-400 hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className={cancelled ? "opacity-60" : ""}>
                <p className={`font-mono text-sm font-semibold text-zinc-900 ${cancelled ? "line-through" : ""}`}>{inv.invoice_no}</p>
                <p className="text-sm text-zinc-600">
                  {inv.customer_name}
                  {inv.customer_phone ? ` · ${inv.customer_phone}` : ""}
                </p>
                <p className="text-xs text-zinc-400">{formatDateTimeIST(inv.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-zinc-900 ${cancelled ? "line-through" : ""}`}>{formatINR(inv.grand_total)}</span>
                <InvoiceBadge cancelled={cancelled} due={due} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
