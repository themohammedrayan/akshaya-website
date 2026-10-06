import Link from "next/link";
import { getStaffProfile } from "@/lib/staff";
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request: requestId } = await searchParams;
  const { supabase, profile } = await getStaffProfile();

  const [{ data: services }, { data: slabs }, { data: request }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_en, variable_govt_fee, default_govt_fee, default_service_charge")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("service_charge_slabs").select("service_id, up_to, charge"),
    requestId
      ? supabase
          .from("requests")
          .select("id, tracking_code, customer_name, customer_phone, service_id")
          .eq("id", requestId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/invoices" className="text-sm text-zinc-500 hover:text-brand-700">
        ← Invoices
      </Link>
      <h1 className="mt-2 text-xl font-bold text-zinc-900">New invoice</h1>
      {request && (
        <p className="mt-1 text-sm text-zinc-500">
          For website request <span className="font-mono">{request.tracking_code}</span>
        </p>
      )}
      <div className="mt-4">
        <InvoiceForm
          services={services ?? []}
          slabs={slabs ?? []}
          isOwner={profile?.role === "owner"}
          prefill={{
            customerName: request?.customer_name,
            customerPhone: request?.customer_phone,
            requestId: request?.id ?? null,
            serviceId: request?.service_id ?? null,
          }}
        />
      </div>
    </div>
  );
}
