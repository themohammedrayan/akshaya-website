import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { getStaffProfile } from "@/lib/staff";
import { formatDateTimeIST, formatINR, isValidDate, todayIST } from "@/lib/billing";

const ACCOUNTS = ["cash", "bank", "wallet", "csc"] as const;
const LABELS = { cash: "Cash", bank: "Bank", wallet: "Akshaya wallet", csc: "CSC wallet" };

function signed(n: number): string {
  return `${n < 0 ? "−" : ""}${formatINR(Math.abs(n))}`;
}

export default async function DayCloseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") redirect("/dashboard/close");

  const params = await searchParams;
  const today = todayIST();
  const from = isValidDate(params.from) ? params.from : `${today.slice(0, 8)}01`;
  const to = isValidDate(params.to) && params.to >= from ? params.to : today;

  const { data: closings } = await supabase
    .from("day_closings")
    .select(
      "id, close_date, is_opening, status, actual_cash, actual_bank, actual_wallet, actual_csc, upi_pending, takings, expenses, owner_took, billed_total, note, closed_at, closer:profiles!day_closings_closed_by_fkey(name)",
    )
    .gte("close_date", from)
    .lte("close_date", to)
    .order("close_date", { ascending: false })
    .order("closed_at", { ascending: false });

  const rows = closings ?? [];
  // Reopened closes are kept for the record but don't count.
  const counted = rows.filter((c) => c.status === "closed" && !c.is_opening);
  const sum = (key: "takings" | "expenses" | "owner_took" | "billed_total") =>
    counted.reduce((s, c) => s + Number(c[key] ?? 0), 0);
  const totals = {
    takings: sum("takings"),
    expenses: sum("expenses"),
    owner_took: sum("owner_took"),
    billed: sum("billed_total"),
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/close" className="text-sm text-zinc-500 hover:text-brand-700">
            ← Day close
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Day close report</h1>
          <p className="text-sm text-zinc-500">
            What the shop made, from how the balances changed. Separate from bills — billed totals are shown for comparison only.
          </p>
        </div>
        {/* Plain <a download>: a CSV from a route handler needs a full browser request, not client navigation. */}
        <a
          href={`/dashboard/close/history/export?from=${from}&to=${to}`}
          download
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Download CSV
        </a>
      </div>

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
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Card label={`Shop made (${counted.length} days)`} value={totals.takings} highlight />
        <Card label="Expenses" value={totals.expenses} />
        <Card label="After expenses" value={totals.takings - totals.expenses} />
        <Card label="Owner took" value={totals.owner_took} />
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Bills recorded over the same days: {formatINR(totals.billed)} (info only).
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Date</th>
              {ACCOUNTS.map((a) => (
                <th key={a} className="px-4 py-3 text-right font-medium">
                  {LABELS[a]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">GPay next day</th>
              <th className="px-4 py-3 text-right font-medium">Shop made</th>
              <th className="px-4 py-3 text-right font-medium">Expenses</th>
              <th className="px-4 py-3 text-right font-medium">Owner took</th>
              <th className="px-4 py-3 text-right font-medium">Billed (info)</th>
              <th className="px-4 py-3 font-medium">Closed by · note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-zinc-500">
                  No closes in this period.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className={clsx("border-b border-zinc-100", c.status !== "closed" && "opacity-50")}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {c.close_date}
                  {c.is_opening && <span className="ml-2 text-xs text-brand-700">opening</span>}
                  {c.status !== "closed" && <span className="ml-2 text-xs text-zinc-500">reopened</span>}
                </td>
                {ACCOUNTS.map((a) => (
                  <td key={a} className="px-4 py-3 text-right text-zinc-700">
                    {formatINR(c[`actual_${a}`])}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-zinc-700">{formatINR(c.upi_pending)}</td>
                <td
                  className={clsx(
                    "px-4 py-3 text-right font-semibold",
                    Number(c.takings) < 0 ? "text-red-700" : "text-emerald-700",
                  )}
                >
                  {c.takings === null ? "—" : signed(Number(c.takings))}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700">{c.expenses === null ? "—" : formatINR(c.expenses)}</td>
                <td className="px-4 py-3 text-right text-zinc-700">{c.owner_took === null ? "—" : formatINR(c.owner_took)}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{c.billed_total === null ? "—" : formatINR(c.billed_total)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {c.closer?.name ?? "—"} · {formatDateTimeIST(c.closed_at)}
                  {c.note && <span className="block text-xs text-zinc-500">{c.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-4", highlight ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white")}>
      <p className="text-sm text-zinc-600">{label}</p>
      <p className={clsx("mt-1 text-2xl font-bold", value < 0 ? "text-red-700" : "text-zinc-900")}>{signed(value)}</p>
    </div>
  );
}
