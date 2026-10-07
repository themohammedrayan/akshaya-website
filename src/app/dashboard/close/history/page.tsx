import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { getStaffProfile } from "@/lib/staff";
import { formatDateTimeIST, formatINR } from "@/lib/billing";

const ACCOUNTS = ["cash", "bank", "wallet", "csc"] as const;
const LABELS = { cash: "Cash", bank: "Bank", wallet: "Akshaya wallet", csc: "CSC wallet" };

export default async function CloseHistoryPage() {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") redirect("/dashboard/close");

  const { data: closings } = await supabase
    .from("day_closings")
    .select(
      "id, close_date, is_opening, status, actual_cash, actual_bank, actual_wallet, actual_csc, expected_cash, expected_bank, expected_wallet, expected_csc, upi_pending, note, closed_at, reopened_at, closer:profiles!day_closings_closed_by_fkey(name)",
    )
    .order("close_date", { ascending: false })
    .order("closed_at", { ascending: false })
    .limit(120);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/close" className="text-sm text-zinc-500 hover:text-brand-700">
            ← Day close
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Closing history</h1>
          <p className="text-sm text-zinc-500">
            Difference = actual − expected. Reopened closes are kept for the record (shown faded).
          </p>
        </div>
        {/* Plain <a download>: a CSV from a route handler needs a full browser request, not client navigation. */}
        <a href="/dashboard/close/history/export" download className="text-sm font-medium text-brand-700 hover:underline">
          Download CSV
        </a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Date</th>
              {ACCOUNTS.map((a) => (
                <th key={a} className="px-4 py-3 text-right font-medium">
                  {LABELS[a]} (actual / diff)
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Closed by · note</th>
            </tr>
          </thead>
          <tbody>
            {(closings ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No closes yet.
                </td>
              </tr>
            )}
            {(closings ?? []).map((c) => (
              <tr key={c.id} className={clsx("border-b border-zinc-100", c.status !== "closed" && "opacity-50")}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {c.close_date}
                  {c.is_opening && <span className="ml-2 text-xs text-brand-700">opening</span>}
                  {c.status !== "closed" && <span className="ml-2 text-xs text-zinc-500">reopened</span>}
                </td>
                {ACCOUNTS.map((a) => {
                  const actual = Number(c[`actual_${a}`]);
                  const diff = actual - Number(c[`expected_${a}`]);
                  return (
                    <td key={a} className="px-4 py-3 text-right">
                      {formatINR(actual)}
                      {!c.is_opening && (
                        <span
                          className={clsx(
                            "ml-2 rounded-full px-2 py-0.5 text-xs font-semibold",
                            Math.abs(diff) < 0.005
                              ? "bg-emerald-100 text-emerald-800"
                              : Math.abs(diff) <= 10
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-700",
                          )}
                        >
                          {Math.abs(diff) < 0.005 ? "✓" : `${diff > 0 ? "+" : "−"}${formatINR(Math.abs(diff))}`}
                        </span>
                      )}
                    </td>
                  );
                })}
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
