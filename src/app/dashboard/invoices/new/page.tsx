import { getStaffProfile } from "@/lib/staff";
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";
import { daysAgoISO } from "@/lib/billing";

const USAGE_WINDOW_DAYS = 30;

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request: requestId } = await searchParams;
  const { supabase, profile } = await getStaffProfile();

  const since = daysAgoISO(USAGE_WINDOW_DAYS);

  const [{ data: services }, { data: slabs }, { data: recentLines }, { data: request }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_en, name_ml, category, variable_govt_fee, default_govt_fee, default_service_charge, sort_order")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("service_charge_slabs").select("service_id, up_to, charge"),
    // Most-used services float to the top of the tile grid.
    supabase
      .from("invoice_items")
      .select("service_id, qty, invoice:invoices!inner(created_at)")
      .not("service_id", "is", null)
      .gte("invoice.created_at", since),
    requestId
      ? supabase
          .from("requests")
          .select("id, tracking_code, customer_name, customer_phone, service_id")
          .eq("id", requestId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const usage = new Map<string, number>();
  for (const line of recentLines ?? []) {
    if (line.service_id) usage.set(line.service_id, (usage.get(line.service_id) ?? 0) + line.qty);
  }
  const sorted = [...(services ?? [])].sort(
    (a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.sort_order - b.sort_order,
  );

  return (
    <InvoiceForm
      services={sorted}
      slabs={slabs ?? []}
      isOwner={profile?.role === "owner"}
      prefill={{
        customerName: request?.customer_name,
        customerPhone: request?.customer_phone,
        requestId: request?.id ?? null,
        trackingCode: request?.tracking_code ?? null,
        serviceId: request?.service_id ?? null,
      }}
    />
  );
}
