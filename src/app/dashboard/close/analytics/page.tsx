import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { getStaffProfile } from "@/lib/staff";
import { formatINR, isValidDate, istRange, todayIST } from "@/lib/billing";
import {
  byWeekday,
  change,
  expensesByAccount,
  inRange,
  lastTwelveMonths,
  moneyAt,
  previousPeriod,
  shiftDate,
  summarize,
  topExpenses,
  type CloseRow,
  type ExpenseRow,
} from "@/lib/closeAnalytics";
import { BarChart, HBars, Legend, SERIES, StackedBarChart } from "@/components/dashboard/charts";

const ACCOUNTS = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "wallet", label: "Akshaya wallet" },
  { key: "csc", label: "CSC wallet" },
  { key: "upi", label: "GPay next day" },
] as const;

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const signed = (v: number) => `${v < 0 ? "−" : ""}${formatINR(Math.abs(v))}`;
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function CloseAnalyticsPage({
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
  const prev = previousPeriod(from, to);
  const yearStart = `${shiftDate(`${today.slice(0, 8)}01`, -335).slice(0, 8)}01`;
  const start = prev.from < yearStart ? prev.from : yearStart;

  const [{ data: closeData }, { data: expenseData }] = await Promise.all([
    supabase
      .from("day_closings")
      .select("close_date, actual_cash, actual_bank, actual_wallet, actual_csc, upi_pending, takings, expenses, owner_took, billed_total")
      .eq("status", "closed")
      .eq("is_opening", false)
      .gte("close_date", start)
      .lte("close_date", to > today ? to : today)
      .order("close_date"),
    supabase
      .from("money_movements")
      .select("amount, note, from_account")
      .eq("kind", "expense")
      .eq("status", "active")
      .gte("moved_at", istRange(from, to)[0])
      .lt("moved_at", istRange(from, to)[1]),
  ]);

  const all = (closeData ?? []) as CloseRow[];
  const rows = inRange(all, from, to);
  const cur = summarize(rows);
  const before = summarize(inRange(all, prev.from, prev.to));
  const months = lastTwelveMonths(all, today);
  const weekdays = byWeekday(rows);
  const expenses = (expenseData ?? []) as ExpenseRow[];
  const latest = rows.at(-1);

  const presets = [
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
    { label: "Last 30 days", from: shiftDate(today, -29), to: today },
    { label: "Last 90 days", from: shiftDate(today, -89), to: today },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/close" className="text-sm text-zinc-500 hover:text-brand-700">
        ← Day close
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">Shop analytics</h1>
      <p className="mt-1 text-sm text-zinc-500">
        From day closes. &ldquo;Shop made&rdquo; already excludes govt fees paid from the bank and wallets, so margin is profit on
        service income.
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
              href={`/dashboard/close/analytics?from=${p.from}&to=${p.to}`}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs hover:bg-zinc-50",
                p.from === from && p.to === to ? "border-brand-600 text-brand-800" : "border-zinc-300 text-zinc-700",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <Link href={`/dashboard/close/history?from=${from}&to=${to}`} className="ml-auto text-sm font-medium text-brand-700 hover:underline">
          Day close report
        </Link>
      </form>

      {cur.days === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-8 text-center text-zinc-500 shadow-sm">
          No closes in this period yet. Analytics fill in as the shop closes each day.
        </p>
      ) : (
        <>
          {/* 1. Profit & margin */}
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Profit & margin · {cur.days} day{cur.days === 1 ? "" : "s"} closed
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Shop made" value={signed(cur.takings)} delta={change(cur.takings, before.takings)} highlight />
            <Kpi label="Expenses" value={formatINR(cur.expenses)} delta={change(cur.expenses, before.expenses)} lowerIsBetter />
            <Kpi label="Net profit" value={signed(cur.net)} delta={change(cur.net, before.net)} />
            <Kpi label="Margin" value={pct(cur.margin)} delta={cur.margin !== null && before.margin !== null ? cur.margin - before.margin : null} points />
            <Kpi label="Average per day" value={cur.avgPerDay === null ? "—" : signed(cur.avgPerDay)} delta={change(cur.avgPerDay, before.avgPerDay)} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Compared with {prev.from} – {prev.to}
            {before.days === 0 ? " (no closes then)" : ` (${before.days} days closed)`}.
          </p>

          {/* 2. Trends */}
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Trends</h2>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <Panel title="Each day" subtitle="Shop made (bars) and net after expenses (line)">
              <Legend items={[{ label: "Shop made", color: SERIES[0] }, { label: "Net", color: SERIES[1], line: true }]} />
              <BarChart
                ariaLabel="Shop made and net profit per day"
                data={rows.map((r) => ({
                  label: dayLabel(r.close_date),
                  value: Number(r.takings ?? 0),
                  tip: `${dayLabel(r.close_date)} · made ${signed(Number(r.takings ?? 0))} · net ${signed(Number(r.takings ?? 0) - Number(r.expenses ?? 0))}`,
                }))}
                line={rows.map((r) => Number(r.takings ?? 0) - Number(r.expenses ?? 0))}
              />
              <p className="text-sm text-zinc-600">
                Best: <b>{cur.best && `${dayLabel(cur.best.close_date)} ${signed(Number(cur.best.takings ?? 0))}`}</b> · Lowest:{" "}
                <b>{cur.worst && `${dayLabel(cur.worst.close_date)} ${signed(Number(cur.worst.takings ?? 0))}`}</b>
              </p>
            </Panel>
            <Panel title="Last 12 months" subtitle="Net profit per month">
              <BarChart
                ariaLabel="Net profit per month, last 12 months"
                data={months.map((m) => ({
                  label: m.label,
                  value: m.net,
                  tip: `${m.label} · made ${signed(m.takings)} · expenses ${formatINR(m.expenses)} · net ${signed(m.net)} · ${m.days} days`,
                }))}
              />
            </Panel>
            <Panel title="Busiest days of the week" subtitle="Average shop made per weekday">
              <HBars
                rows={weekdays.map((w) => ({
                  label: `${w.day}${w.days ? ` (${w.days})` : ""}`,
                  value: w.avg ?? 0,
                  detail: `${w.days} days closed`,
                }))}
              />
            </Panel>

            {/* 3. Money position */}
            <Panel title="Money position" subtitle="Total money at each close, by where it sits">
              <Legend items={ACCOUNTS.map((a, i) => ({ label: a.label, color: SERIES[i] }))} />
              <StackedBarChart
                ariaLabel="Money by account at each close"
                series={SERIES}
                rows={rows.map((r) => {
                  const m = moneyAt(r);
                  return { label: dayLabel(r.close_date), values: ACCOUNTS.map((a) => m[a.key]) };
                })}
              />
              {latest && (
                <p className="text-sm text-zinc-600">
                  At {dayLabel(latest.close_date)}: <b>{formatINR(moneyAt(latest).total)}</b> in total · owner took{" "}
                  <b>{formatINR(cur.ownerTook)}</b> in this period
                </p>
              )}
            </Panel>
          </div>

          {/* 4. Expenses & billing coverage */}
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Expenses & billing</h2>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <Panel title="Top expenses" subtitle="Grouped by what they were for">
              {expenses.length === 0 ? (
                <p className="text-sm text-zinc-500">No expenses recorded.</p>
              ) : (
                <>
                  <HBars
                    color={SERIES[1]}
                    rows={topExpenses(expenses).map((e) => ({
                      label: e.label,
                      value: e.total,
                      detail: `${e.count} entr${e.count === 1 ? "y" : "ies"}`,
                    }))}
                  />
                  <p className="text-xs text-zinc-500">
                    Paid from:{" "}
                    {Object.entries(expensesByAccount(expenses))
                      .map(([acc, v]) => `${ACCOUNTS.find((a) => a.key === acc)?.label ?? acc} ${formatINR(v)}`)
                      .join(" · ")}
                  </p>
                </>
              )}
            </Panel>
            <Panel title="Billing coverage" subtitle="Bills recorded ÷ what the shop made">
              <p className="text-3xl font-bold text-zinc-900">{pct(cur.coverage)}</p>
              <p className="text-sm text-zinc-600">
                {formatINR(cur.billed)} billed of {signed(cur.takings)} made. Bills include govt fees, so this can pass 100% once
                every payment is billed.
              </p>
              <BarChart
                ariaLabel="Billed amount per day"
                color={SERIES[2]}
                data={rows.map((r) => ({
                  label: dayLabel(r.close_date),
                  value: Number(r.billed_total ?? 0),
                  tip: `${dayLabel(r.close_date)} · billed ${formatINR(r.billed_total)} · made ${signed(Number(r.takings ?? 0))}`,
                }))}
                height={160}
              />
            </Panel>
          </div>

          {/* Table view of everything charted (also the accessible fallback). */}
          <details className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800">Show as table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Shop made</th>
                    <th className="px-3 py-2 text-right font-medium">Expenses</th>
                    <th className="px-3 py-2 text-right font-medium">Net</th>
                    <th className="px-3 py-2 text-right font-medium">Owner took</th>
                    <th className="px-3 py-2 text-right font-medium">Billed</th>
                    {ACCOUNTS.map((a) => (
                      <th key={a.key} className="px-3 py-2 text-right font-medium">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const m = moneyAt(r);
                    return (
                      <tr key={r.close_date} className="border-b border-zinc-100">
                        <td className="px-3 py-2 text-zinc-900">{r.close_date}</td>
                        <td className="px-3 py-2 text-right">{signed(Number(r.takings ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{formatINR(r.expenses)}</td>
                        <td className="px-3 py-2 text-right">{signed(Number(r.takings ?? 0) - Number(r.expenses ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{formatINR(r.owner_took)}</td>
                        <td className="px-3 py-2 text-right">{formatINR(r.billed_total)}</td>
                        {ACCOUNTS.map((a) => (
                          <td key={a.key} className="px-3 py-2 text-right">
                            {formatINR(m[a.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  delta,
  highlight,
  lowerIsBetter,
  points,
}: {
  label: string;
  value: string;
  delta: number | null;
  highlight?: boolean;
  lowerIsBetter?: boolean;
  /** delta is a difference of two ratios, shown in percentage points. */
  points?: boolean;
}) {
  const good = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
  return (
    <div className={clsx("rounded-lg border p-4", highlight ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white")}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      <p className={clsx("mt-0.5 text-xs", delta === null || delta === 0 ? "text-zinc-400" : good ? "text-emerald-700" : "text-red-700")}>
        {delta === null
          ? "no earlier data"
          : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} ${Math.abs(Math.round(delta * 100))}${points ? " pts" : "%"} vs before`}
      </p>
    </div>
  );
}
