"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatINR } from "@/lib/billing";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  addMovement,
  cancelMovement,
  closeDay,
  reopenDay,
  saveCloseNote,
  setOpening,
  type CloseResult,
} from "@/app/dashboard/close/actions";
import { XIcon } from "./icons";

type Account = "cash" | "bank" | "wallet" | "csc";
type Kind = "expense" | "deposit" | "withdrawal" | "topup";

export type Movement = {
  id: string;
  kind: string;
  from_account: string;
  to_account: string | null;
  amount: number;
  note: string | null;
  status: string;
  moved_at: string;
};

const KINDS: { kind: Kind; from: Account[]; to: (Account | null)[]; color: string }[] = [
  { kind: "expense", from: ["cash", "bank", "wallet", "csc"], to: [null], color: "border-red-200 bg-red-50 text-red-800" },
  { kind: "deposit", from: ["cash"], to: ["bank"], color: "border-brand-200 bg-brand-50 text-brand-800" },
  { kind: "withdrawal", from: ["cash", "bank"], to: [null], color: "border-amber-200 bg-amber-50 text-amber-800" },
  { kind: "topup", from: ["cash", "bank"], to: ["wallet", "csc"], color: "border-violet-200 bg-violet-50 text-violet-800" },
];

const ACCOUNTS: Account[] = ["cash", "bank", "wallet", "csc"];
const bigInput =
  "w-full rounded-2xl border-2 border-zinc-300 bg-white py-4 pl-10 pr-4 text-2xl font-semibold outline-none focus:border-brand-500";

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function MoneyInput({ label, hint, value, onChange, autoFocus }: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-base font-semibold text-zinc-800">{label}</span>
      {hint && <span className="block text-sm text-zinc-500">{hint}</span>}
      <span className="relative mt-1 block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400">₹</span>
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className={bigInput}
        />
      </span>
    </label>
  );
}

// ₹10 and ₹20 cover both notes and coins of that value.
const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
const COIN_ONLY = new Set([5, 2, 1]);

// Cash field with an optional note-by-note counter; the counter writes its total into the field.
function CashInput({ label, hint, value, onChange, tr }: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  tr: Tr;
}) {
  const [byNotes, setByNotes] = useState(false);
  const [pieces, setPieces] = useState<Record<number, string>>({});

  function setPiece(denom: number, raw: string) {
    const next = { ...pieces, [denom]: raw.replace(/\D/g, "") };
    setPieces(next);
    onChange(String(DENOMINATIONS.reduce((s, d) => s + d * Number(next[d] || 0), 0)));
  }

  return (
    <div>
      {byNotes ? (
        <div className="block">
          <span className="text-base font-semibold text-zinc-800">{label}</span>
          {hint && <span className="block text-sm text-zinc-500">{hint}</span>}
          <div className="mt-2 space-y-2 rounded-2xl border-2 border-zinc-200 p-3">
            {DENOMINATIONS.map((d) => (
              <label key={d} className="flex items-center gap-3">
                <span className="w-20 text-right text-lg font-semibold text-zinc-700">
                  ₹{d}
                  {COIN_ONLY.has(d) && <span className="block text-xs font-normal text-zinc-400">{tr("coins")}</span>}
                </span>
                <span className="text-zinc-400">×</span>
                <input
                  value={pieces[d] ?? ""}
                  onChange={(e) => setPiece(d, e.target.value)}
                  inputMode="numeric"
                  className="w-24 rounded-xl border-2 border-zinc-300 px-3 py-2 text-lg font-semibold outline-none focus:border-brand-500"
                />
                <span className="flex-1 text-right text-base text-zinc-600">
                  {formatINR(d * Number(pieces[d] || 0))}
                </span>
              </label>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-xl font-bold text-zinc-900">
              <span>{tr("notesTotal")}</span>
              <span>{formatINR(Number(value || 0))}</span>
            </div>
          </div>
        </div>
      ) : (
        <MoneyInput label={label} hint={hint} value={value} onChange={onChange} />
      )}
      <button
        type="button"
        onClick={() => {
          if (!byNotes) {
            setPieces({});
            onChange("");
          }
          setByNotes(!byNotes);
        }}
        className="mt-2 text-sm font-semibold text-brand-700 hover:underline"
      >
        {byNotes ? tr("typeTotal") : tr("countNotes")}
      </button>
    </div>
  );
}

export function DayClose({
  date,
  today,
  minDate,
  hasOpening,
  isOwner,
  movements,
  closed,
  upiBilledToday,
}: {
  date: string;
  today: string;
  minDate: string | null;
  hasOpening: boolean;
  isOwner: boolean;
  movements: Movement[];
  closed: CloseResult | null;
  upiBilledToday: number;
}) {
  const { t } = useTranslation();
  const tr = (key: string, vars?: Record<string, string | number>) => t(`billing.close.${key}`, vars);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloseResult | null>(closed);
  const [modalKind, setModalKind] = useState<Kind | null>(null);
  const [counts, setCounts] = useState<Record<Account, string>>({ cash: "", bank: "", wallet: "", csc: "" });
  // Opening balances are "as at the end of" a day - default to yesterday so today can be closed normally.
  const [openingDate, setOpeningDate] = useState(() => minDate ?? previousDay(today));

  const [upiPending, setUpiPending] = useState("");

  const parsed = ACCOUNTS.map((a) => toAmount(counts[a]));
  const upiParsed = toAmount(upiPending);
  const countsValid = parsed.every((v) => v !== null) && upiParsed !== null;
  const balances = { cash: parsed[0], bank: parsed[1], wallet: parsed[2], csc: parsed[3], upiPending: upiParsed };
  const upiInput = (
    <MoneyInput
      label={tr("upiPending")}
      hint={upiBilledToday > 0 ? tr("upiPendingBilled", { amount: formatINR(upiBilledToday) }) : tr("upiPendingHint")}
      value={upiPending}
      onChange={setUpiPending}
    />
  );

  function run(fn: () => Promise<{ error: string | null }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  // ---------- First-time setup ----------
  if (!hasOpening) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-zinc-900">{tr("openingTitle")}</h1>
        {isOwner ? (
          <div className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-base text-zinc-600">{tr("openingHelp")}</p>
            <label className="block text-sm text-zinc-600">
              {tr("openingDate")}
              <input
                type="date"
                value={openingDate}
                max={today}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="mt-1 block rounded-xl border border-zinc-300 px-3 py-2 text-base"
              />
            </label>
            {ACCOUNTS.map((a) =>
              a === "cash" ? (
                <CashInput
                  key={a}
                  label={tr(`account.${a}`)}
                  value={counts[a]}
                  onChange={(v) => setCounts((c) => ({ ...c, [a]: v }))}
                  tr={tr}
                />
              ) : (
                <MoneyInput
                  key={a}
                  label={tr(`account.${a}`)}
                  value={counts[a]}
                  onChange={(v) => setCounts((c) => ({ ...c, [a]: v }))}
                />
              ),
            )}
            {upiInput}
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              disabled={!countsValid || pending}
              onClick={() =>
                run(() =>
                  setOpening({ date: openingDate, ...balances }),
                )
              }
              className="min-h-14 w-full rounded-xl bg-brand-700 text-lg font-bold text-white hover:bg-brand-800 disabled:bg-zinc-300"
            >
              {tr("saveOpening")}
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white p-6 text-base text-zinc-600 shadow-sm">{tr("ownerMustOpen")}</p>
        )}
      </div>
    );
  }

  // ---------- Closed: result ----------
  if (result) {
    return (
      <ResultView
        result={result}
        isOwner={isOwner}
        tr={tr}
        error={error}
        pending={pending}
        onSaveNote={(note) => run(() => saveCloseNote(result.close_date, note), () => setResult({ ...result, note }))}
        onReopen={() => run(() => reopenDay(result.close_date), () => setResult(null))}
      />
    );
  }

  // ---------- Open day: movements + count ----------
  const active = movements.filter((m) => m.status === "active");
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{tr("step1")}</p>
        <h2 className="text-xl font-bold text-zinc-900">{tr("moneyInOut")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{tr("moneyInOutHelp")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              onClick={() => setModalKind(k.kind)}
              className={clsx("min-h-16 rounded-2xl border-2 px-3 text-base font-bold", k.color)}
            >
              + {tr(`kind.${k.kind}`)}
            </button>
          ))}
        </div>

        <ul className="mt-5 divide-y divide-zinc-100">
          {movements.length === 0 && <li className="py-4 text-center text-zinc-400">{tr("noMovements")}</li>}
          {movements.map((m) => (
            <li key={m.id} className={clsx("flex items-center gap-3 py-3", m.status !== "active" && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <p className={clsx("font-semibold text-zinc-900", m.status !== "active" && "line-through")}>
                  {tr(`kind.${m.kind}`)} · {formatINR(m.amount)}
                </p>
                <p className="truncate text-sm text-zinc-500">
                  {tr(`account.${m.from_account}`)}
                  {m.to_account ? ` → ${tr(`account.${m.to_account}`)}` : ""}
                  {m.note ? ` · ${m.note}` : ""}
                </p>
              </div>
              {isOwner && m.status === "active" && (
                <button
                  type="button"
                  aria-label={tr("cancelEntry")}
                  onClick={() => {
                    const reason = window.prompt(tr("cancelReason"));
                    if (reason !== null) run(() => cancelMovement(m.id, reason));
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <XIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
        {active.length > 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            {tr("entriesTotal", { count: active.length, amount: formatINR(active.reduce((s, m) => s + Number(m.amount), 0)) })}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{tr("step2")}</p>
        <h2 className="text-xl font-bold text-zinc-900">{tr("countTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{tr("countHelp")}</p>
        <div className="mt-4 space-y-4">
          <CashInput
            label={tr("account.cash")}
            hint={tr("cashHint")}
            value={counts.cash}
            onChange={(v) => setCounts((c) => ({ ...c, cash: v }))}
            tr={tr}
          />
          <MoneyInput
            label={tr("account.bank")}
            hint={tr("bankHint")}
            value={counts.bank}
            onChange={(v) => setCounts((c) => ({ ...c, bank: v }))}
          />
          <MoneyInput
            label={tr("account.wallet")}
            hint={tr("walletHint")}
            value={counts.wallet}
            onChange={(v) => setCounts((c) => ({ ...c, wallet: v }))}
          />
          <MoneyInput
            label={tr("account.csc")}
            hint={tr("cscHint")}
            value={counts.csc}
            onChange={(v) => setCounts((c) => ({ ...c, csc: v }))}
          />
          {upiInput}
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={!countsValid || pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await closeDay({ date, ...balances });
              if (res.error) setError(res.error);
              else if (res.result) setResult(res.result);
            });
          }}
          className="mt-5 min-h-14 w-full rounded-xl bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-700 disabled:bg-zinc-300"
        >
          {pending ? tr("closing") : tr("closeButton", { date })}
        </button>
      </section>

      {modalKind && (
        <MovementModal
          kind={modalKind}
          tr={tr}
          pending={pending}
          onClose={() => setModalKind(null)}
          onSave={(from, to, amount, note) =>
            run(() => addMovement({ kind: modalKind, from, to, amount, note }), () => setModalKind(null))
          }
          error={error}
        />
      )}
    </div>
  );
}

type Tr = (key: string, vars?: Record<string, string | number>) => string;

function MovementModal({
  kind,
  tr,
  pending,
  error,
  onClose,
  onSave,
}: {
  kind: Kind;
  tr: Tr;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (from: Account, to: Account | null, amount: number, note: string) => void;
}) {
  const shape = KINDS.find((k) => k.kind === kind)!;
  const [from, setFrom] = useState<Account>(shape.from[0]);
  const [to, setTo] = useState<Account | null>(shape.to[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const value = toAmount(amount);
  const needsNote = kind === "expense" && !note.trim();
  const valid = value !== null && value > 0 && !needsNote;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <form
        className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(from, to, value!, note.trim());
        }}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-zinc-900">{tr(`kind.${kind}`)}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-zinc-500">{tr(`kindHelp.${kind}`)}</p>
        <MoneyInput label={tr("amount")} value={amount} onChange={setAmount} autoFocus />
        {shape.to.length > 1 && (
          <AccountPicker label={tr("toWallet")} options={shape.to as Account[]} value={to} onChange={setTo} tr={tr} />
        )}
        {shape.from.length > 1 && (
          <AccountPicker label={tr("paidFrom")} options={shape.from} value={from} onChange={setFrom} tr={tr} />
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={kind === "expense" ? tr("expenseNote") : tr("note")}
          className={clsx("w-full rounded-xl border-2 px-4 py-3 text-base", needsNote ? "border-amber-300" : "border-zinc-300")}
        />
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-zinc-300 text-base font-semibold text-zinc-700">
            {tr("cancel")}
          </button>
          <button
            type="submit"
            disabled={!valid || pending}
            className="min-h-12 rounded-xl bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-zinc-300"
          >
            {tr("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountPicker({ label, options, value, onChange, tr }: {
  label: string;
  options: Account[];
  value: Account | null;
  onChange: (a: Account) => void;
  tr: Tr;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-600">{label}</p>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:flex">
        {options.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={clsx(
              "min-h-11 flex-1 rounded-xl border-2 px-2 text-base font-semibold",
              value === a ? "border-brand-600 bg-brand-50 text-brand-800" : "border-zinc-200 text-zinc-700",
            )}
          >
            {tr(`account.${a}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({
  result,
  isOwner,
  tr,
  error,
  pending,
  onSaveNote,
  onReopen,
}: {
  result: CloseResult;
  isOwner: boolean;
  tr: Tr;
  error: string | null;
  pending: boolean;
  onSaveNote: (note: string) => void;
  onReopen: () => void;
}) {
  const [note, setNote] = useState(result.note ?? "");
  const prev = result.previous;
  const takings = Number(result.takings);
  const billed = Number(result.billed);
  const upiChange = Number(result.upi_pending) - Number(prev.upi_pending);
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatINR(Math.abs(n))}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{tr("step3")}</p>
        <h1 className="text-2xl font-bold text-zinc-900">{tr("resultTitle", { date: result.close_date })}</h1>
        <p className="text-sm text-zinc-500">{tr("sincePrevious", { date: prev.date })}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-emerald-50 p-5 shadow-sm">
          <p className="text-base font-semibold text-emerald-800">{tr("takings")}</p>
          <p className={clsx("text-3xl font-bold", takings < 0 ? "text-red-700" : "text-emerald-900")}>{signed(takings)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-base font-semibold text-zinc-700">{tr("net")}</p>
          <p className="text-3xl font-bold text-zinc-900">{signed(Number(result.net))}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-100 px-5 py-3 text-sm font-medium text-zinc-500">
          <span />
          <span className="text-right">{tr("previous")}</span>
          <span className="text-right">{tr("now")}</span>
          <span className="text-right">{tr("change")}</span>
        </div>
        {ACCOUNTS.map((a) => {
          const change = Number(result.actual[a]) - Number(prev[a]);
          return (
            <div key={a} className="grid grid-cols-4 items-center gap-2 border-b border-zinc-100 px-5 py-4">
              <span className="text-base font-semibold text-zinc-900">{tr(`account.${a}`)}</span>
              <span className="text-right text-base text-zinc-600">{formatINR(prev[a])}</span>
              <span className="text-right text-base font-semibold text-zinc-900">{formatINR(result.actual[a])}</span>
              <span className={clsx("text-right text-base font-semibold", change < 0 ? "text-red-700" : "text-emerald-700")}>
                {signed(change)}
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-4 items-center gap-2 px-5 py-4">
          <span className="text-base font-semibold text-zinc-900">{tr("upiPendingShort")}</span>
          <span className="text-right text-base text-zinc-600">{formatINR(prev.upi_pending)}</span>
          <span className="text-right text-base font-semibold text-zinc-900">{formatINR(result.upi_pending)}</span>
          <span className={clsx("text-right text-base font-semibold", upiChange < 0 ? "text-red-700" : "text-emerald-700")}>
            {signed(upiChange)}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 text-base text-zinc-700 shadow-sm">
        <ul className="space-y-1">
          <li>{tr("addedBack", { expense: formatINR(result.expenses), took: formatINR(result.owner_took) })}</li>
          <li className="text-sm text-zinc-500">{tr("transfersNote")}</li>
        </ul>
        <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
          {tr("billedInfo", { amount: formatINR(billed) })}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-base font-semibold text-zinc-800">{tr("noteOptional")}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-base"
        />
        <button
          type="button"
          disabled={pending || !note.trim() || note.trim() === (result.note ?? "")}
          onClick={() => onSaveNote(note.trim())}
          className="mt-2 min-h-11 rounded-xl bg-brand-700 px-5 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-zinc-300"
        >
          {tr("saveNote")}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {isOwner && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(tr("reopenConfirm"))) onReopen();
          }}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          {tr("reopen")}
        </button>
      )}
    </div>
  );
}
