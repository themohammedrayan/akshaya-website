import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProfile } from "@/lib/staff";
import { formatINR, isValidDate, todayIST } from "@/lib/billing";

type Summary = {
  billed: { count: number; govt_total: number; service_total: number; grand_total: number };
  cancelled_count: number;
  collected: { total: number; cash: number; upi: number; card: number };
  outstanding: { count: number; total: number };
  overrides: number;
  adjustments: { discount_total: number; discount_bills: number; extra_total: number; extra_bills: number };
  by_service: { name: string; qty: number | null; govt_total: number; service_total: number }[];
};

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") redirect("/dashboard");

  const params = await searchParams;
  const today = todayIST();
  const from = isValidDate(params.from) ? params.from : today;
  const to = isValidDate(params.to) && params.to >= from ? params.to : from;

  const { data, error } = await supabase.rpc("financial_summary", { p_from: from, p_to: to });
  const summary = data as Summary | null;

  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">Financial report</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Govt fees are money collected on customers&apos; behalf and paid on — only the service charge is the center&apos;s income.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-sm text-zinc-600">
          From <input type="date" name="from" defaultValue={from} className="ml-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-zinc-600">
          To <input type="date" name="to" defaultValue={to} className="ml-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Show
        </button>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/dashboard/reports?from=${p.from}&to=${p.to}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              {p.label}
            </Link>
          ))}
        </div>
        <a
          href={`/dashboard/reports/export?from=${from}&to=${to}`}
          className="ml-auto text-sm font-medium text-brand-700 hover:underline"
        >
          Download CSV
        </a>
      </form>

      {error || !summary ? (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load the report: {error?.message}</p>
      ) : (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Billed ({summary.billed.count} invoices{summary.cancelled_count ? `, ${summary.cancelled_count} cancelled` : ""})
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Card label="Total billed" value={summary.billed.grand_total} />
            <Card label="Govt fees (pass-through)" value={summary.billed.govt_total} note="Not income" />
            <Card label="Our income (service charges)" value={summary.billed.service_total} highlight />
          </div>
          {(summary.adjustments.discount_total > 0 || summary.adjustments.extra_total > 0) && (
            <p className="mt-2 text-sm text-zinc-600">
              Included in income:{" "}
              <span className="font-medium text-amber-700">
                discounts given −{formatINR(summary.adjustments.discount_total)} ({summary.adjustments.discount_bills} bill
                {summary.adjustments.discount_bills === 1 ? "" : "s"})
              </span>
              {" · "}
              <span className="font-medium text-emerald-700">
                extra collected +{formatINR(summary.adjustments.extra_total)} ({summary.adjustments.extra_bills} bill
                {summary.adjustments.extra_bills === 1 ? "" : "s"})
              </span>
              . <Link href="/dashboard/invoices" className="text-brand-700 hover:underline">See bills</Link> for reasons.
            </p>
          )}

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Money received in this period (by payment date)
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <Card label="Cash" value={summary.collected.cash} note="Should be in the drawer" />
            <Card label="UPI" value={summary.collected.upi} />
            <Card label="Card" value={summary.collected.card} />
            <Card label="Total received" value={summary.collected.total} />
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">Outstanding (all time, as of now)</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Card label={`Credit dues · ${summary.outstanding.count} invoice(s)`} value={summary.outstanding.total} />
          </div>
          {summary.outstanding.count > 0 && (
            <Link href="/dashboard/invoices?status=unpaid" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
              View unpaid invoices →
            </Link>
          )}

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">By service</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Govt fees</th>
                  <th className="px-4 py-2 text-right font-medium">Our income</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_service.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      No invoices in this period.
                    </td>
                  </tr>
                )}
                {summary.by_service.map((row) => (
                  <tr key={row.name} className="border-b border-zinc-100">
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2 text-right">{row.qty ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{formatINR(row.govt_total)}</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-700">{formatINR(row.service_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, note, highlight }: { label: string; value: number; note?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-emerald-800" : "text-zinc-900"}`}>{formatINR(value)}</p>
      {note && <p className="mt-0.5 text-xs text-zinc-400">{note}</p>}
    </div>
  );
}
