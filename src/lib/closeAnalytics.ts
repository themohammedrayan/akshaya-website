// Shop performance worked out from day closes (the balance register), not from bills.
// Pure functions so the page and any future export use the same formulas.

export type CloseRow = {
  close_date: string;
  actual_cash: number;
  actual_bank: number;
  actual_wallet: number;
  actual_csc: number;
  upi_pending: number;
  takings: number | null;
  expenses: number | null;
  owner_took: number | null;
  billed_total: number | null;
};

export type ExpenseRow = { amount: number; note: string | null; from_account: string };

export type Summary = {
  days: number;
  takings: number;
  expenses: number;
  net: number;
  /** net ÷ takings; null when nothing was made. */
  margin: number | null;
  avgPerDay: number | null;
  ownerTook: number;
  billed: number;
  /** billed ÷ takings; null when nothing was made. */
  coverage: number | null;
  best: CloseRow | null;
  worst: CloseRow | null;
};

const n = (v: number | string | null | undefined) => Number(v ?? 0);

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** The same number of days immediately before from..to. */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  return { from: shiftDate(from, -len), to: shiftDate(from, -1) };
}

export function inRange(rows: CloseRow[], from: string, to: string): CloseRow[] {
  return rows.filter((r) => r.close_date >= from && r.close_date <= to);
}

export function summarize(rows: CloseRow[]): Summary {
  const takings = rows.reduce((s, r) => s + n(r.takings), 0);
  const expenses = rows.reduce((s, r) => s + n(r.expenses), 0);
  const billed = rows.reduce((s, r) => s + n(r.billed_total), 0);
  const net = takings - expenses;
  let best: CloseRow | null = null;
  let worst: CloseRow | null = null;
  for (const r of rows) {
    if (!best || n(r.takings) > n(best.takings)) best = r;
    if (!worst || n(r.takings) < n(worst.takings)) worst = r;
  }
  return {
    days: rows.length,
    takings,
    expenses,
    net,
    margin: takings > 0 ? net / takings : null,
    avgPerDay: rows.length ? takings / rows.length : null,
    ownerTook: rows.reduce((s, r) => s + n(r.owner_took), 0),
    billed,
    coverage: takings > 0 ? billed / takings : null,
    best,
    worst,
  };
}

/** Relative change; null when there's nothing to compare against. */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Average takings per weekday, Monday first. */
export function byWeekday(rows: CloseRow[]): { day: string; avg: number | null; days: number }[] {
  const sums = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }));
  for (const r of rows) {
    const i = (new Date(`${r.close_date}T00:00:00Z`).getUTCDay() + 6) % 7;
    sums[i].total += n(r.takings);
    sums[i].days += 1;
  }
  return sums.map((s, i) => ({ day: WEEKDAYS[i], avg: s.days ? s.total / s.days : null, days: s.days }));
}

/** The 12 calendar months ending with `today`'s month, oldest first. */
export function lastTwelveMonths(rows: CloseRow[], today: string) {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: 12 }, (_, k) => {
    const d = new Date(Date.UTC(y, m - 1 - (11 - k), 1));
    const key = d.toISOString().slice(0, 7);
    const s = summarize(rows.filter((r) => r.close_date.startsWith(key)));
    return {
      key,
      label: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      takings: s.takings,
      expenses: s.expenses,
      net: s.net,
      days: s.days,
    };
  });
}

export function moneyAt(r: CloseRow) {
  const cash = n(r.actual_cash);
  const bank = n(r.actual_bank);
  const wallet = n(r.actual_wallet);
  const csc = n(r.actual_csc);
  const upi = n(r.upi_pending);
  return { cash, bank, wallet, csc, upi, total: cash + bank + wallet + csc + upi };
}

/** Expenses grouped by what they were for (note, ignoring case/spacing), biggest first. */
export function topExpenses(rows: ExpenseRow[], limit = 8) {
  const groups = new Map<string, { label: string; total: number; count: number }>();
  for (const r of rows) {
    const label = (r.note ?? "").trim().replace(/\s+/g, " ") || "(no note)";
    const key = label.toLowerCase();
    const g = groups.get(key) ?? { label, total: 0, count: 0 };
    g.total += n(r.amount);
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function expensesByAccount(rows: ExpenseRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.from_account] = (out[r.from_account] ?? 0) + n(r.amount);
  return out;
}
