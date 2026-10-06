"use client";

import { useActionState, useMemo, useState } from "react";
import { createInvoice, type InvoiceFormState } from "@/app/dashboard/invoices/actions";
import {
  PAYMENT_MODES,
  formatINR,
  round2,
  serviceChargeFor,
  type BillableService,
  type ChargeSlab,
} from "@/lib/billing";

type Line = {
  key: number;
  serviceId: string; // "" = custom item
  description: string;
  qty: string;
  govtFee: string;
  serviceCharge: string; // only used for custom items and owner overrides
  override: boolean;
  overrideReason: string;
};

type Prefill = {
  customerName?: string;
  customerPhone?: string;
  requestId?: string | null;
  serviceId?: string | null;
};

const inputClass = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const readOnlyClass = "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700";

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

let nextKey = 1;

function newLine(service?: BillableService): Line {
  return {
    key: nextKey++,
    serviceId: service?.id ?? "",
    description: "",
    qty: "1",
    govtFee: service && !service.variable_govt_fee ? String(service.default_govt_fee) : "",
    serviceCharge: "",
    override: false,
    overrideReason: "",
  };
}

export function InvoiceForm({
  services,
  slabs,
  isOwner,
  prefill,
}: {
  services: BillableService[];
  slabs: ChargeSlab[];
  isOwner: boolean;
  prefill: Prefill;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(createInvoice, { error: null });

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const prefillService = prefill.serviceId ? serviceById.get(prefill.serviceId) : undefined;

  const [customerName, setCustomerName] = useState(prefill.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(prefill.customerPhone ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(prefillService)]);
  const [mode, setMode] = useState<string>("cash");
  const [amountReceived, setAmountReceived] = useState<string | null>(null); // null = follow the total
  const [reference, setReference] = useState("");

  // Resolve each line to the amounts that will actually be billed.
  const resolved = lines.map((line) => {
    const service = line.serviceId ? serviceById.get(line.serviceId) : undefined;
    const qty = Math.max(1, Math.floor(toNumber(line.qty)) || 1);
    if (!service || line.override) {
      return { line, service, qty, govtFee: round2(toNumber(line.govtFee)), serviceCharge: round2(toNumber(line.serviceCharge)) };
    }
    const govtFee = service.variable_govt_fee ? round2(toNumber(line.govtFee)) : Number(service.default_govt_fee);
    return { line, service, qty, govtFee, serviceCharge: serviceChargeFor(service, govtFee, slabs) };
  });

  const govtTotal = round2(resolved.reduce((sum, r) => sum + r.qty * r.govtFee, 0));
  const serviceTotal = round2(resolved.reduce((sum, r) => sum + r.qty * r.serviceCharge, 0));
  const grandTotal = round2(govtTotal + serviceTotal);
  const paidNow = mode === "credit" ? 0 : amountReceived === null ? grandTotal : round2(toNumber(amountReceived));

  function update(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function changeService(key: number, serviceId: string) {
    const service = serviceById.get(serviceId);
    setLines((current) => current.map((l) => (l.key === key ? { ...newLine(service), key } : l)));
  }

  const payload = JSON.stringify({
    customerName,
    customerPhone,
    requestId: prefill.requestId ?? null,
    notes,
    items: resolved.map((r) => ({
      serviceId: r.line.serviceId || null,
      description: r.line.serviceId ? (r.service?.name_en ?? "") : r.line.description,
      qty: r.qty,
      govtFee: r.govtFee,
      serviceCharge: r.serviceCharge,
      overrideReason: r.line.override ? r.line.overrideReason : "",
    })),
    payment: { mode, amount: paidNow, reference },
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Customer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-600">
            Name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-sm text-zinc-600">
            Phone (optional)
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              inputMode="tel"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Items</h2>
        <p className="mt-1 text-xs text-zinc-500">
          For bill / tax payments, type only the bill amount - the service charge is picked automatically from the slabs.
        </p>

        <div className="mt-4 space-y-4">
          {resolved.map(({ line, service, govtFee, serviceCharge, qty }) => {
            const govtEditable = !service || service.variable_govt_fee || line.override;
            const chargeEditable = !service || line.override;
            return (
              <div key={line.key} className="rounded-lg border border-zinc-200 p-3">
                <div className="grid gap-3 sm:grid-cols-12">
                  <label className="text-xs text-zinc-500 sm:col-span-5">
                    Item
                    <select
                      value={line.serviceId}
                      onChange={(e) => changeService(line.key, e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    >
                      <option value="">Custom item…</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name_en}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500 sm:col-span-1">
                    Qty
                    <input
                      value={line.qty}
                      onChange={(e) => update(line.key, { qty: e.target.value })}
                      inputMode="numeric"
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <label className="text-xs text-zinc-500 sm:col-span-2">
                    {service?.variable_govt_fee ? "Bill / tax amount" : "Govt fee"}
                    {govtEditable ? (
                      <input
                        value={line.govtFee}
                        onChange={(e) => update(line.key, { govtFee: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        required={!!service?.variable_govt_fee}
                        className={`mt-1 ${inputClass}`}
                      />
                    ) : (
                      <div className={`mt-1 ${readOnlyClass}`}>{govtFee.toFixed(2)}</div>
                    )}
                  </label>
                  <label className="text-xs text-zinc-500 sm:col-span-2">
                    Service charge
                    {chargeEditable ? (
                      <input
                        value={line.serviceCharge}
                        onChange={(e) => update(line.key, { serviceCharge: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        className={`mt-1 ${inputClass}`}
                      />
                    ) : (
                      <div className={`mt-1 ${readOnlyClass}`}>{serviceCharge.toFixed(2)}</div>
                    )}
                  </label>
                  <div className="text-xs text-zinc-500 sm:col-span-2">
                    Amount
                    <div className="mt-1 px-1 py-2 text-sm font-semibold text-zinc-900">
                      {formatINR(qty * (govtFee + serviceCharge))}
                    </div>
                  </div>
                </div>

                {!service && (
                  <input
                    value={line.description}
                    onChange={(e) => update(line.key, { description: e.target.value })}
                    placeholder="Description, e.g. Lamination"
                    required
                    className={`mt-3 ${inputClass}`}
                  />
                )}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {service && isOwner ? (
                    <label className="flex items-center gap-2 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={line.override}
                        onChange={(e) =>
                          update(line.key, {
                            override: e.target.checked,
                            govtFee: String(govtFee),
                            serviceCharge: String(serviceCharge),
                            overrideReason: "",
                          })
                        }
                      />
                      Override amounts (owner)
                    </label>
                  ) : (
                    <span />
                  )}
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {line.override && (
                  <input
                    value={line.overrideReason}
                    onChange={(e) => update(line.key, { overrideReason: e.target.value })}
                    placeholder="Reason for override (required)"
                    required
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLines((current) => [...current, newLine()])}
          className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          + Add item
        </button>

        <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-zinc-50 p-4 text-sm">
          <div>
            <dt className="text-zinc-500">Govt fees (pass-through)</dt>
            <dd className="font-semibold text-zinc-900">{formatINR(govtTotal)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Service charge (income)</dt>
            <dd className="font-semibold text-emerald-700">{formatINR(serviceTotal)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="text-lg font-bold text-zinc-900">{formatINR(grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Payment</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...PAYMENT_MODES, { value: "credit", label: "Credit (pay later)" }].map((m) => (
            <label
              key={m.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                mode === m.value ? "border-brand-600 bg-brand-50 font-medium text-brand-800" : "border-zinc-300 text-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>

        {mode !== "credit" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-zinc-600">
              Amount received now
              <input
                value={amountReceived ?? String(grandTotal)}
                onChange={(e) => setAmountReceived(e.target.value)}
                inputMode="decimal"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            {mode !== "cash" && (
              <label className="text-sm text-zinc-600">
                {mode === "upi" ? "UPI reference no. (optional)" : "Card ref / last 4 digits (optional)"}
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={`mt-1 ${inputClass}`} />
              </label>
            )}
          </div>
        )}
        {paidNow < grandTotal && (
          <p className="mt-3 text-sm text-amber-700">Balance due after this bill: {formatINR(grandTotal - paidNow)}</p>
        )}

        <label className="mt-4 block text-sm text-zinc-600">
          Note (optional, printed on the bill)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
      </section>

      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : `Save & print invoice · ${formatINR(grandTotal)}`}
      </button>
    </form>
  );
}
