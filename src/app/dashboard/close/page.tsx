import Link from "next/link";
import { getStaffProfile } from "@/lib/staff";
import { getServerTranslation } from "@/lib/i18n/server";
import { isValidDate, istRange, todayIST } from "@/lib/billing";
import { DayClose, type Movement } from "@/components/dashboard/DayClose";
import type { CloseResult } from "./actions";
import { SubmitButton } from "@/components/dashboard/SubmitButton";
import Form from "next/form";

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function DayClosePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await getStaffProfile();
  const { t } = await getServerTranslation();
  const isOwner = profile?.role === "owner";

  const today = todayIST();
  const date = isValidDate(params.date) && params.date <= today ? params.date : today;

  const { data: statusData } = await supabase.rpc("day_close_status");
  const status = statusData as { has_opening: boolean; last_close_date: string | null; upi_billed_today: number } | null;
  const lastClose = status?.last_close_date ?? null;

  const [{ data: closed }, { data: movements }] = await Promise.all([
    supabase.rpc("day_close_result", { p_date: date }),
    // Everything recorded since the last close is part of the next close.
    supabase
      .from("money_movements")
      .select("id, kind, from_account, to_account, amount, note, status, moved_at")
      .gte("moved_at", istRange(lastClose ? nextDay(lastClose) : today, today)[0])
      .order("moved_at", { ascending: false }),
  ]);

  return (
    <div>
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t("billing.close.title")}</h1>
          {lastClose && (
            <p className="text-sm text-zinc-500">{t("billing.close.lastClosed", { date: lastClose })}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Form action="/dashboard/close" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              max={today}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-base"
            />
            <SubmitButton className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50">
              {t("billing.close.go")}
            </SubmitButton>
          </Form>
          {isOwner && (
            <Link href="/dashboard/close/history" className="text-sm font-medium text-brand-700 hover:underline">
              {t("billing.close.history")}
            </Link>
          )}
          {isOwner && (
            <Link href="/dashboard/close/analytics" className="text-sm font-medium text-brand-700 hover:underline">
              {t("billing.close.analytics")}
            </Link>
          )}
        </div>
      </div>

      <DayClose
        key={date}
        date={date}
        today={today}
        minDate={lastClose}
        hasOpening={!!status?.has_opening}
        isOwner={isOwner}
        movements={(movements ?? []) as Movement[]}
        closed={(closed as CloseResult | null) ?? null}
        upiBilledToday={date === today ? Number(status?.upi_billed_today ?? 0) : 0}
      />
    </div>
  );
}
