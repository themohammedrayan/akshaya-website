import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffProfile } from "@/lib/staff";
import { PAYMENT_MODES, formatDateTimeIST, formatINR, paymentModeLabel } from "@/lib/billing";
import { InvoiceBadge } from "@/components/dashboard/InvoiceBadge";
import { addPayment, cancelInvoice } from "../actions";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, profile } = await getStaffProfile();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "*, created_by_profile:profiles!invoices_created_by_fkey(name), request:requests(id, tracking_code), items:invoice_items(*), payments:invoice_payments(*, received_by_profile:profiles(name))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const items = [...invoice.items].sort((a, b) => a.sort_order - b.sort_order);
  const payments = [...invoice.payments].sort((a, b) => a.received_at.localeCompare(b.received_at));
  const cancelled = invoice.status === "cancelled";
  const due = Number(invoice.grand_total) - Number(invoice.paid_total);
  const isOwner = profile?.role === "owner";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/invoices" className="text-sm text-zinc-500 hover:text-brand-700">
        ← Invoices
      </Link>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`font-mono text-lg font-bold text-zinc-900 ${cancelled ? "line-through" : ""}`}>{invoice.invoice_no}</p>
            <p className="text-sm text-zinc-600">
              {invoice.customer_name}
              {invoice.customer_phone ? ` · ${invoice.customer_phone}` : ""}
            </p>
            <p className="text-xs text-zinc-400">
              {formatDateTimeIST(invoice.created_at)}
              {invoice.created_by_profile ? ` · by ${invoice.created_by_profile.name}` : ""}
              {invoice.request && (
                <>
                  {" · "}
                  <Link href={`/dashboard/${invoice.request.id}`} className="font-mono hover:text-brand-700">
                    {invoice.request.tracking_code}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InvoiceBadge cancelled={cancelled} due={due} />
            <Link
              href={`/dashboard/invoices/${invoice.id}/print`}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Print
            </Link>
          </div>
        </div>

        {cancelled && (
          <p className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
            Cancelled {invoice.cancelled_at ? formatDateTimeIST(invoice.cancelled_at) : ""} — {invoice.cancel_reason}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 pr-2 font-medium">Item</th>
                <th className="py-2 pr-2 text-right font-medium">Qty</th>
                <th className="py-2 pr-2 text-right font-medium">Govt fee</th>
                <th className="py-2 pr-2 text-right font-medium">Service charge</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-2 text-zinc-900">
                    {item.description}
                    {item.charge_overridden && (
                      <span className="ml-2 text-xs text-amber-700" title={item.override_reason ?? ""}>
                        (override: {item.override_reason})
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">{item.qty}</td>
                  <td className="py-2 pr-2 text-right">{formatINR(item.govt_fee)}</td>
                  <td className="py-2 pr-2 text-right">{formatINR(item.service_charge)}</td>
                  <td className="py-2 text-right font-medium">{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Govt fees</dt>
            <dd className="font-semibold">{formatINR(invoice.govt_total)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Service charge</dt>
            <dd className="font-semibold text-emerald-700">{formatINR(invoice.service_total)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="font-bold">{formatINR(invoice.grand_total)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Paid</dt>
            <dd className="font-semibold">{formatINR(invoice.paid_total)}</dd>
          </div>
        </dl>
        {invoice.notes && <p className="mt-3 text-sm text-zinc-600">Note: {invoice.notes}</p>}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Payments</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No payments yet (credit).</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {paymentModeLabel(p.mode)}
                  {p.reference ? ` · ${p.reference}` : ""}
                  <span className="text-xs text-zinc-400">
                    {" "}
                    · {formatDateTimeIST(p.received_at)}
                    {p.received_by_profile ? ` · ${p.received_by_profile.name}` : ""}
                  </span>
                </span>
                <span className="font-medium">{formatINR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {!cancelled && due > 0 && (
          <form action={addPayment} className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="text-xs text-zinc-500">
              Mode
              <select name="mode" className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Amount
              <input
                name="amount"
                defaultValue={due.toFixed(2)}
                inputMode="decimal"
                className="mt-1 block w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Reference (optional)
              <input name="reference" className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Record payment
            </button>
          </form>
        )}
      </div>

      {isOwner && !cancelled && (
        <details className="mt-6 rounded-lg border border-red-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-medium text-red-700">Cancel this invoice</summary>
          <p className="mt-2 text-xs text-zinc-500">
            Cancelled invoices stay on record (the number is never reused) but are left out of all totals. Refund any
            money collected separately.
          </p>
          <form action={cancelInvoice} className="mt-3 flex flex-wrap gap-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input
              name="reason"
              required
              placeholder="Reason, e.g. wrong amount - reissued"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Cancel invoice
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
