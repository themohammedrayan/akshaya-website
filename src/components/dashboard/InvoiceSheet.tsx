import { formatDateTimeIST, formatINR, paymentModeLabel } from "@/lib/billing";
import { CENTER } from "@/lib/center";

export type PrintableInvoice = {
  invoice_no: string;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  notes: string | null;
  govt_total: number;
  service_total: number;
  grand_total: number | null;
  paid_total: number;
  extra_amount: number;
  discount_amount: number;
  items: {
    id: string;
    description: string;
    qty: number;
    govt_fee: number;
    service_charge: number;
    line_total: number | null;
    sort_order: number;
  }[];
  payments: { mode: string; reference: string | null }[];
};

function amount(n: number | null) {
  return Number(n ?? 0).toFixed(2);
}

/**
 * The printed bill. Half an A4 sheet: content is held to the top 148mm (A5
 * landscape area) with a cut line below it, so it prints on any A4 printer.
 */
export function InvoiceSheet({ invoice }: { invoice: PrintableInvoice }) {
  const items = [...invoice.items].sort((a, b) => a.sort_order - b.sort_order);
  const due = Number(invoice.grand_total) - Number(invoice.paid_total);
  const modes = [...new Set(invoice.payments.map((p) => paymentModeLabel(p.mode)))].join(" + ");
  const refs = invoice.payments.map((p) => p.reference).filter(Boolean).join(", ");
  const cancelled = invoice.status === "cancelled";
  const hasGovtFees = Number(invoice.govt_total) > 0;
  const extra = Number(invoice.extra_amount);
  const discount = Number(invoice.discount_amount);

  // Line totals. A bill-level extra (customer left the change) is not shown as
  // its own line - it's folded into the last line's service charge so the
  // lines still add up. A discount is shown to the customer as its own row.
  const rows = items.map((item, i) => {
    const charge = item.qty * Number(item.service_charge) + (i === items.length - 1 ? extra : 0);
    const govt = item.qty * Number(item.govt_fee);
    return { ...item, govt, charge, total: govt + charge };
  });

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div
        className="invoice-sheet relative mx-auto bg-white text-[11px] leading-snug text-black shadow-md"
        style={{ width: "210mm", minHeight: "148mm", padding: "8mm 10mm 6mm" }}
      >
        {cancelled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold text-red-600/20">
            CANCELLED
          </div>
        )}

        <header className="flex items-start justify-between border-b border-black pb-2">
          <div className="flex items-start gap-3">
            {/* Plain <img>, not next/image: the print dialog opens on page load and
                must not wait on the image optimizer. PrintButton waits for it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/akshaya-logo.png" alt="Akshaya" width={64} height={53} className="h-[14mm] w-auto" />
            <div>
              <p className="text-base font-bold">{CENTER.name}</p>
              <p>CSC ID: {CENTER.cscId}</p>
              {CENTER.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>Ph: {CENTER.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wide">Bill / Receipt</p>
            <p>
              No: <span className="font-mono font-semibold">{invoice.invoice_no}</span>
            </p>
            <p>{formatDateTimeIST(invoice.created_at)}</p>
          </div>
        </header>

        <p className="mt-2">
          <span className="text-zinc-600">Customer:</span> <span className="font-semibold">{invoice.customer_name}</span>
          {invoice.customer_phone && <span> · {invoice.customer_phone}</span>}
        </p>

        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-y border-black text-left">
              <th className="py-1 pr-2 font-semibold">#</th>
              <th className="py-1 pr-2 font-semibold">Item</th>
              <th className="py-1 pr-2 text-right font-semibold">Qty</th>
              {hasGovtFees && <th className="py-1 pr-2 text-right font-semibold">Govt fee</th>}
              <th className="py-1 pr-2 text-right font-semibold">Service charge</th>
              <th className="py-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="border-b border-zinc-300">
                <td className="py-1 pr-2">{i + 1}</td>
                <td className="py-1 pr-2">{row.description}</td>
                <td className="py-1 pr-2 text-right">{row.qty}</td>
                {hasGovtFees && <td className="py-1 pr-2 text-right">{amount(row.govt)}</td>}
                <td className="py-1 pr-2 text-right">{amount(row.charge)}</td>
                <td className="py-1 text-right">{amount(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex justify-between gap-6">
          <div className="max-w-[55%] space-y-1">
            <p>
              <span className="text-zinc-600">Payment:</span>{" "}
              {invoice.payments.length === 0 ? "Credit (pay later)" : modes}
              {refs && <span> · Ref: {refs}</span>}
            </p>
            {invoice.notes && <p>Note: {invoice.notes}</p>}
            {hasGovtFees && (
              <p className="text-[10px] text-zinc-600">
                Govt fees are collected on behalf of the department / authority and paid to them in full.
              </p>
            )}
          </div>
          <table className="min-w-[45%]">
            <tbody>
              {hasGovtFees && (
                <tr>
                  <td className="pr-4">Govt fees</td>
                  <td className="text-right">{formatINR(invoice.govt_total)}</td>
                </tr>
              )}
              <tr>
                <td className="pr-4">Service charge</td>
                <td className="text-right">{formatINR(Number(invoice.service_total) + discount)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td className="pr-4">Discount</td>
                  <td className="text-right">−{formatINR(discount)}</td>
                </tr>
              )}
              <tr className="border-t border-black text-sm font-bold">
                <td className="pr-4">Total</td>
                <td className="text-right">{formatINR(invoice.grand_total)}</td>
              </tr>
              <tr>
                <td className="pr-4">Paid</td>
                <td className="text-right">{formatINR(invoice.paid_total)}</td>
              </tr>
              {due > 0 && (
                <tr className="font-semibold">
                  <td className="pr-4">Balance due</td>
                  <td className="text-right">{formatINR(due)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <p className="text-[10px] text-zinc-600">Thank you! Please keep this receipt for your records.</p>
          <p className="border-t border-black px-6 pt-1">Authorised signature</p>
        </div>
      </div>
      <div
        className="mx-auto border-t border-dashed border-zinc-400 text-center text-[9px] text-zinc-400"
        style={{ width: "210mm" }}
      >
        ✂ cut here
      </div>
    </div>
  );
}
