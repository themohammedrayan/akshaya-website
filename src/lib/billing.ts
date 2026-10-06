// Shared billing helpers. Money stays in rupees as JS numbers (2dp) - every
// amount is re-validated and re-totalled in Postgres (create_invoice +
// refresh_invoice_totals), so these are for display/preview only.

export type BillableService = {
  id: string;
  name_en: string;
  variable_govt_fee: boolean;
  default_govt_fee: number;
  default_service_charge: number;
};

export type ChargeSlab = {
  service_id: string | null;
  up_to: number | null;
  charge: number;
};

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number]["value"];

export function paymentModeLabel(mode: string): string {
  return PAYMENT_MODES.find((m) => m.value === mode)?.label ?? mode;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function formatINR(amount: number | null | undefined): string {
  return inr.format(Number(amount ?? 0));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Mirrors public.service_charge_for() - keep the two in sync. */
export function serviceChargeFor(service: BillableService, govtAmount: number, slabs: ChargeSlab[]): number {
  if (!service.variable_govt_fee) return Number(service.default_service_charge);

  const own = slabs.filter((s) => s.service_id === service.id);
  const set = own.length > 0 ? own : slabs.filter((s) => s.service_id === null);
  if (set.length === 0) return Number(service.default_service_charge);

  const match = [...set]
    .sort((a, b) => (a.up_to ?? Infinity) - (b.up_to ?? Infinity))
    .find((s) => s.up_to === null || Number(s.up_to) >= govtAmount);
  return match ? Number(match.charge) : Number(service.default_service_charge);
}

/** Today's date (YYYY-MM-DD) in India time. */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** [start, end) ISO timestamps covering whole IST days from..to inclusive. */
export function istRange(from: string, to: string): [string, string] {
  const end = new Date(`${to}T00:00:00+05:30`);
  end.setUTCDate(end.getUTCDate() + 1);
  return [new Date(`${from}T00:00:00+05:30`).toISOString(), end.toISOString()];
}

export function formatDateTimeIST(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isValidDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** ISO timestamp `days` days before now (per-request, for server queries). */
export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
