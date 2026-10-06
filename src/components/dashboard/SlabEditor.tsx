"use client";

import { useActionState, useState } from "react";
import { saveSlabs, type SlabFormState } from "@/app/dashboard/prices/actions";

type Row = { key: number; upTo: string; charge: string };

const inputClass = "w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";
let nextKey = 1;

/**
 * Edits one slab set: "bill amount up to X -> charge Y" bands plus a final
 * "above that" band. serviceId null = the default set.
 */
export function SlabEditor({
  serviceId,
  initial,
}: {
  serviceId: string | null;
  initial: { up_to: number | null; charge: number }[];
}) {
  const [state, formAction, pending] = useActionState<SlabFormState, FormData>(saveSlabs, { error: null, saved: false });

  const sorted = [...initial].sort((a, b) => (a.up_to ?? Infinity) - (b.up_to ?? Infinity));
  const [bands, setBands] = useState<Row[]>(() =>
    sorted.filter((s) => s.up_to !== null).map((s) => ({ key: nextKey++, upTo: String(s.up_to), charge: String(s.charge) })),
  );
  const [aboveCharge, setAboveCharge] = useState(() => String(sorted.find((s) => s.up_to === null)?.charge ?? ""));

  const orderedBands = [...bands].sort((a, b) => (Number(a.upTo) || Infinity) - (Number(b.upTo) || Infinity));
  const highest = orderedBands.length ? orderedBands[orderedBands.length - 1].upTo : "";

  const payload = JSON.stringify([
    ...bands.map((b) => ({ up_to: Number(b.upTo), charge: Number(b.charge) })),
    { up_to: null, charge: Number(aboveCharge) },
  ]);

  function update(key: number, patch: Partial<Row>) {
    setBands((current) => current.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="serviceId" value={serviceId ?? ""} />
      <input type="hidden" name="slabs" value={payload} />

      {bands.map((band) => (
        <div key={band.key} className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
          Bill amount up to ₹
          <input
            value={band.upTo}
            onChange={(e) => update(band.key, { upTo: e.target.value })}
            inputMode="decimal"
            required
            className={inputClass}
          />
          → charge ₹
          <input
            value={band.charge}
            onChange={(e) => update(band.key, { charge: e.target.value })}
            inputMode="decimal"
            required
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setBands((current) => current.filter((b) => b.key !== band.key))}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
        {bands.length ? `Above ₹${highest || "…"}` : "Any amount"} → charge ₹
        <input value={aboveCharge} onChange={(e) => setAboveCharge(e.target.value)} inputMode="decimal" required className={inputClass} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setBands((current) => [...current, { key: nextKey++, upTo: "", charge: "" }])}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          + Add band
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save bands"}
        </button>
        {state.saved && !state.error && <span className="text-xs text-emerald-700">Saved</span>}
        {state.error && <span className="text-xs text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
