import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { InvoiceSheet } from "@/components/dashboard/InvoiceSheet";

// A4 page with no margins - InvoiceSheet positions itself in the top half.
const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  .invoice-sheet { box-shadow: none !important; margin: 0 !important; }
}
`;

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto } = await searchParams;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_no, created_at, customer_name, customer_phone, status, notes, govt_total, service_total, grand_total, paid_total, items:invoice_items(id, description, qty, govt_fee, service_charge, line_total, sort_order), payments:invoice_payments(mode, reference)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  return (
    <div>
      <style>{PRINT_CSS}</style>

      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/dashboard/invoices/${id}`} className="text-sm text-zinc-500 hover:text-brand-700">
          ← Back to invoice
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices/new" className="text-sm font-medium text-brand-700 hover:underline">
            + New invoice
          </Link>
          <PrintButton autoPrint={auto === "1"} />
        </div>
      </div>

      <InvoiceSheet invoice={invoice} />
    </div>
  );
}
