import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslation } from "@/lib/i18n/server";
import { formatDateTimeIST, istRange, isValidDate, todayIST } from "@/lib/billing";
import { toWhatsAppNumber } from "@/lib/whatsappTemplates";
import { logCall } from "./actions";
import { SubmitButton } from "@/components/dashboard/SubmitButton";
import Form from "next/form";

const TABS = ["new", "today", "overdue", "upcoming", "all"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  new: "tabNew",
  today: "tabToday",
  overdue: "tabOverdue",
  upcoming: "tabUpcoming",
  all: "tabAll",
};

const STATUS_LABEL: Record<string, string> = {
  new: "statusNew",
  follow_up: "statusFollowUp",
  visited: "statusVisited",
  closed: "statusClosed",
};

const OUTCOME_LABEL: Record<string, string> = {
  talked: "outcomeTalked",
  no_answer: "outcomeNoAnswer",
  call_again: "outcomeCallAgain",
  visited: "outcomeVisited",
  not_interested: "outcomeNotInterested",
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; error?: string }>;
}) {
  const filters = await searchParams;
  const tab: Tab = TABS.find((t) => t === filters.tab) ?? "new";
  const date = tab === "all" && isValidDate(filters.date) ? filters.date : undefined;
  const today = todayIST();
  const { lang, t } = await getServerTranslation();
  const tf = (key: string, vars?: Record<string, string | number>) => t(`followups.${key}`, vars);
  const supabase = await createClient();

  let query = supabase
    .from("enquiries")
    .select(
      "id, phone, name, kind, last_message, message_count, status, follow_up_on, created_at, last_contact_at, service:services(name_ml, name_en), enquiry_calls(id, outcome, note, called_at, caller:profiles(name))",
    )
    // Call history comes embedded in the same request (newest first).
    .order("called_at", { referencedTable: "enquiry_calls", ascending: false })
    .limit(200);

  if (tab === "new") query = query.eq("status", "new").order("last_contact_at", { ascending: true });
  if (tab === "today") query = query.eq("status", "follow_up").eq("follow_up_on", today).order("last_contact_at");
  if (tab === "overdue") query = query.eq("status", "follow_up").lt("follow_up_on", today).order("follow_up_on");
  if (tab === "upcoming") query = query.eq("status", "follow_up").gt("follow_up_on", today).order("follow_up_on");
  if (tab === "all") {
    query = query.order("last_contact_at", { ascending: false });
    if (date) {
      const [start, end] = istRange(date, date);
      query = query.gte("last_contact_at", start).lt("last_contact_at", end);
    }
  }

  const { data: enquiries } = await query;

  const tomorrow = addDays(today, 1);

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">{tf("title")}</h1>
      <p className="mt-1 text-sm text-zinc-500">{tf("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/dashboard/followups?tab=${key}`}
            className={clsx(
              "flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold",
              tab === key ? "bg-brand-700 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {tf(TAB_LABEL[key])}
          </Link>
        ))}
      </div>

      {tab === "all" && (
        <Form action="/dashboard/followups" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <input type="hidden" name="tab" value="all" />
          <input type="date" name="date" defaultValue={date ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <SubmitButton className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            {tf("filter")}
          </SubmitButton>
          {date && (
            <Link href="/dashboard/followups?tab=all" className="text-sm text-zinc-500 hover:text-brand-700">
              {tf("clear")}
            </Link>
          )}
        </Form>
      )}

      {filters.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{filters.error}</p>
      )}

      <div className="mt-6 grid gap-3">
        {(enquiries ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">{tf("empty")}</p>
        )}

        {(enquiries ?? []).map((e) => {
          const history = e.enquiry_calls;
          const serviceName = e.service ? (lang === "ml" ? e.service.name_ml : e.service.name_en) : null;
          const open = e.status === "new" || e.status === "follow_up";
          return (
            <div key={e.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">
                    {e.name ?? "—"} <span className="font-mono text-sm font-normal text-zinc-600">· {e.phone}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {e.kind === "callback" ? `📞 ${tf("kindCallback")}` : `💬 ${tf("kindMessage")}`} ·{" "}
                    {serviceName ?? <span className="text-zinc-400">{tf("noService")}</span>}
                  </p>
                  {e.last_message && (
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                      {e.last_message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    {tf("firstContact")}: {formatDateTimeIST(e.created_at)} · {tf("lastContact")}:{" "}
                    {formatDateTimeIST(e.last_contact_at)}
                    {e.message_count > 1 && <> · {tf("messages", { count: e.message_count })}</>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {e.follow_up_on && open && (
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        e.follow_up_on < today ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {tf("followUpOn", { date: e.follow_up_on })}
                    </span>
                  )}
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                    {tf(STATUS_LABEL[e.status] ?? "statusNew")}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`tel:+91${e.phone}`}
                  className="flex min-h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  📞 {tf("call")}
                </a>
                <a
                  href={`https://wa.me/${toWhatsAppNumber(e.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50"
                >
                  {tf("whatsapp")}
                </a>
              </div>

              {open && (
                <form action={logCall} className="mt-3 grid gap-2 border-t border-zinc-100 pt-3">
                  <input type="hidden" name="enquiryId" value={e.id} />
                  <input type="hidden" name="tab" value={tab} />
                  <input
                    name="note"
                    maxLength={500}
                    placeholder={tf("note")}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <OutcomeButton value="talked" label={tf("outcomeTalked")} />
                    <OutcomeButton value="no_answer" label={tf("outcomeNoAnswer")} />
                    <OutcomeButton value="visited" label={tf("outcomeVisited")} tone="good" />
                    <OutcomeButton value="not_interested" label={tf("outcomeNotInterested")} tone="muted" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-zinc-600" htmlFor={`fu-${e.id}`}>
                      {tf("callAgainOn")}
                    </label>
                    <input
                      id={`fu-${e.id}`}
                      type="date"
                      name="followUpOn"
                      min={today}
                      defaultValue={tomorrow}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <OutcomeButton value="call_again" label={tf("outcomeCallAgain")} />
                  </div>
                </form>
              )}

              {history.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-zinc-500">
                    {tf("history")} ({history.length})
                  </summary>
                  <ul className="mt-2 grid gap-1">
                    {history.map((c) => (
                      <li key={c.id} className="text-zinc-700">
                        <span className="text-xs text-zinc-400">{formatDateTimeIST(c.called_at)}</span> ·{" "}
                        <span className="font-medium">{tf(OUTCOME_LABEL[c.outcome] ?? c.outcome)}</span>
                        {c.caller?.name && <span className="text-zinc-500"> · {c.caller.name}</span>}
                        {c.note && <span className="text-zinc-600"> — {c.note}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeButton({ value, label, tone }: { value: string; label: string; tone?: "good" | "muted" }) {
  return (
    <SubmitButton
      name="outcome"
      value={value}
      className={clsx(
        "min-h-10 rounded-lg px-3 text-sm font-medium",
        tone === "good"
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
          : tone === "muted"
            ? "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
            : "bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100",
      )}
    >
      {label}
    </SubmitButton>
  );
}
