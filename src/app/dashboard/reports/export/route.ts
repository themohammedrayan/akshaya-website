import type { NextRequest } from "next/server";
import { getStaffProfile } from "@/lib/staff";
import { istRange, isValidDate, todayIST } from "@/lib/billing";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote everything, and defuse spreadsheet formula injection from names.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// One row per invoice line, for the accountant / Excel.
export async function GET(request: NextRequest) {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return new Response("Forbidden", { status: 403 });

  const params = request.nextUrl.searchParams;
  const from = isValidDate(params.get("from") ?? undefined) ? params.get("from")! : todayIST();
  const toParam = params.get("to") ?? undefined;
  const to = isValidDate(toParam) && toParam >= from ? toParam : from;
  const [start, end] = istRange(from, to);

  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_no, created_at, customer_name, customer_phone, status, paid_total, grand_total, items:invoice_items(*)")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at");

  if (error) return new Response(error.message, { status: 500 });

  const header = [
    "Invoice no",
    "Date",
    "Customer",
    "Phone",
    "Status",
    "Item",
    "Qty",
    "Govt fee (each)",
    "Service charge (each)",
    "Govt fee total",
    "Service charge total (income)",
    "Line total",
    "Invoice paid",
    "Invoice total",
    "Override reason",
  ];

  const rows = (data ?? []).flatMap((inv) =>
    [...inv.items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => [
        inv.invoice_no,
        new Date(inv.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        inv.customer_name,
        inv.customer_phone,
        inv.status,
        item.description,
        item.qty,
        item.govt_fee,
        item.service_charge,
        (item.qty * Number(item.govt_fee)).toFixed(2),
        (item.qty * Number(item.service_charge)).toFixed(2),
        item.line_total,
        inv.paid_total,
        inv.grand_total,
        item.override_reason,
      ]),
  );

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices_${from}_to_${to}.csv"`,
    },
  });
}
