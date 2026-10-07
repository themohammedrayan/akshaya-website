import { redirect } from "next/navigation";
import { getStaffProfile } from "@/lib/staff";
import { SlabEditor } from "@/components/dashboard/SlabEditor";
import { addBillingItem, updateServicePricing, revertToDefaultSlabs } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  "e-district": "e-District",
  aadhaar: "Aadhaar",
  other: "Other",
};

const inputClass = "w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") redirect("/dashboard");
  const { error, saved } = await searchParams;

  const [{ data: services }, { data: slabs }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_en, category, active, show_on_website, variable_govt_fee, default_govt_fee, default_service_charge, govt_paid_from")
      .order("sort_order"),
    supabase.from("service_charge_slabs").select("service_id, up_to, charge"),
  ]);

  const defaultSlabs = (slabs ?? []).filter((s) => s.service_id === null);

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">Prices &amp; service charges</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Govt fee = passed on to the department (not income). Service charge = the center&apos;s income. Changes apply to new
        invoices only — old bills keep the amounts they were issued with.
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && !error && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</p>}

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Default service charge bands (bill / tax payments)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Used for every &quot;variable amount&quot; item below unless it has its own bands. Staff type the bill amount; the
          charge is picked from these bands automatically.
        </p>
        <div className="mt-3">
          <SlabEditor serviceId={null} initial={defaultSlabs} />
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        <h2 className="font-semibold text-zinc-900">Items</h2>
        {(services ?? []).map((s) => {
          const ownSlabs = (slabs ?? []).filter((slab) => slab.service_id === s.id);
          return (
            <div key={s.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <form action={updateServicePricing} className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <input type="hidden" name="serviceId" value={s.id} />
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-zinc-900">{s.name_en}</p>
                  <p className="text-xs text-zinc-400">
                    {s.variable_govt_fee ? "Bill / tax payment" : (CATEGORY_LABELS[s.category] ?? s.category)}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input type="checkbox" name="variableGovtFee" defaultChecked={s.variable_govt_fee} />
                  Variable amount (bill/tax)
                </label>
                <label className="text-xs text-zinc-500">
                  Govt fee ₹
                  <input
                    name="defaultGovtFee"
                    defaultValue={s.default_govt_fee}
                    inputMode="decimal"
                    disabled={s.variable_govt_fee}
                    title={s.variable_govt_fee ? "Typed per bill" : undefined}
                    className={`mt-1 block ${inputClass} disabled:bg-zinc-100`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  {s.variable_govt_fee ? "Fallback charge ₹" : "Service charge ₹"}
                  <input
                    name="defaultServiceCharge"
                    defaultValue={s.default_service_charge}
                    inputMode="decimal"
                    className={`mt-1 block ${inputClass}`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Govt fee paid from
                  <select
                    name="govtPaidFrom"
                    defaultValue={s.govt_paid_from}
                    className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  >
                    <option value="bank">Bank</option>
                    <option value="wallet">Akshaya wallet</option>
                    <option value="csc">CSC wallet</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input type="checkbox" name="showOnWebsite" defaultChecked={s.show_on_website} />
                  On website
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input type="checkbox" name="active" defaultChecked={s.active} />
                  Active
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Save
                </button>
              </form>

              {s.variable_govt_fee && (
                <details className="mt-3 border-t border-zinc-100 pt-3" open={ownSlabs.length > 0}>
                  <summary className="cursor-pointer text-xs font-medium text-zinc-600">
                    {ownSlabs.length > 0 ? "Uses its own charge bands" : "Uses the default charge bands — customise"}
                  </summary>
                  <div className="mt-3">
                    <SlabEditor serviceId={s.id} initial={ownSlabs} />
                    {ownSlabs.length > 0 && (
                      <form action={revertToDefaultSlabs} className="mt-2">
                        <input type="hidden" name="serviceId" value={s.id} />
                        <button type="submit" className="text-xs text-zinc-500 hover:text-brand-700 hover:underline">
                          Remove own bands, use the defaults
                        </button>
                      </form>
                    )}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Add a billing item</h2>
        <p className="mt-1 text-xs text-zinc-500">
          For counter work and bill payments (photocopy, lamination, water bill, ...). Not shown on the website.
        </p>
        <form action={addBillingItem} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-zinc-500">
            Name
            <input name="name" required className="mt-1 block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-zinc-500">
            Type
            <select name="category" className="mt-1 block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">
              <option value="other">Other / bill payment</option>
              <option value="e-district">e-District</option>
              <option value="aadhaar">Aadhaar</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-xs text-zinc-600">
            <input type="checkbox" name="variableGovtFee" />
            Variable amount (bill/tax)
          </label>
          <label className="text-xs text-zinc-500">
            Govt fee ₹
            <input name="defaultGovtFee" defaultValue="0" inputMode="decimal" className={`mt-1 block ${inputClass}`} />
          </label>
          <label className="text-xs text-zinc-500">
            Service charge ₹
            <input name="defaultServiceCharge" defaultValue="0" inputMode="decimal" className={`mt-1 block ${inputClass}`} />
          </label>
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Add item
          </button>
        </form>
      </section>
    </div>
  );
}
