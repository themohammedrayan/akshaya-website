import { getStaffProfile } from "@/lib/staff";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return new Response("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("day_closings")
    .select("close_date, is_opening, status, actual_cash, expected_cash, actual_bank, expected_bank, actual_wallet, expected_wallet, actual_csc, expected_csc, upi_pending, note, closed_at")
    .order("close_date");
  if (error) return new Response(error.message, { status: 500 });

  const header = [
    "Date", "Opening", "Status",
    "Cash actual", "Cash expected", "Cash diff",
    "Bank actual", "Bank expected", "Bank diff",
    "Akshaya wallet actual", "Akshaya wallet expected", "Akshaya wallet diff",
    "CSC wallet actual", "CSC wallet expected", "CSC wallet diff",
    "UPI/card arriving next day", "Note", "Closed at",
  ];
  const rows = (data ?? []).map((c) => [
    c.close_date, c.is_opening ? "yes" : "", c.status,
    c.actual_cash, c.expected_cash, (Number(c.actual_cash) - Number(c.expected_cash)).toFixed(2),
    c.actual_bank, c.expected_bank, (Number(c.actual_bank) - Number(c.expected_bank)).toFixed(2),
    c.actual_wallet, c.expected_wallet, (Number(c.actual_wallet) - Number(c.expected_wallet)).toFixed(2),
    c.actual_csc, c.expected_csc, (Number(c.actual_csc) - Number(c.expected_csc)).toFixed(2),
    c.upi_pending, c.note, c.closed_at,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="day_closings.csv"',
    },
  });
}
