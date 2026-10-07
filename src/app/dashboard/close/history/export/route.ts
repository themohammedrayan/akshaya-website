import { getStaffProfile } from "@/lib/staff";
import { isValidDate } from "@/lib/billing";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  let query = supabase
    .from("day_closings")
    .select("close_date, is_opening, status, actual_cash, actual_bank, actual_wallet, actual_csc, upi_pending, takings, expenses, owner_took, billed_total, note, closed_at")
    .order("close_date");
  if (isValidDate(from)) query = query.gte("close_date", from);
  if (isValidDate(to)) query = query.lte("close_date", to);
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const header = [
    "Date", "Opening", "Status",
    "Cash", "Bank", "Akshaya wallet", "CSC wallet", "GPay/UPI arriving next day",
    "Shop made", "Expenses", "After expenses", "Owner took", "Billed (info)",
    "Note", "Closed at",
  ];
  const rows = (data ?? []).map((c) => [
    c.close_date, c.is_opening ? "yes" : "", c.status,
    c.actual_cash, c.actual_bank, c.actual_wallet, c.actual_csc, c.upi_pending,
    c.takings, c.expenses,
    c.takings === null ? "" : (Number(c.takings) - Number(c.expenses ?? 0)).toFixed(2),
    c.owner_took, c.billed_total,
    c.note, c.closed_at,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="day_closings.csv"',
    },
  });
}
