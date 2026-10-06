"use client";

import { useActionState, useMemo, useState } from "react";
import clsx from "clsx";
import { createInvoice, type InvoiceFormState } from "@/app/dashboard/invoices/actions";
import { formatINR, round2, serviceChargeFor, type BillableService, type ChargeSlab } from "@/lib/billing";
import { isValidIndianPhone } from "@/lib/phone";
import { pickLang } from "@/lib/i18n/pickLang";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { MinusIcon, PencilIcon, PlusIcon, SearchIcon, XIcon } from "./icons";

export type BillingService = BillableService & {
  name_ml: string;
  category: string;
};

type Line = {
  key: number;
  serviceId: string | null;
  name_en: string;
  name_ml: string;
  qty: number;
  govtFee: number; // per unit
  serviceCharge: number; // per unit
  overrideReason: string; // non-empty = owner override
};

type Modal =
  | { kind: "amount"; service: BillingService }
  | { kind: "other" }
  | { kind: "edit"; line: Line }
  | null;

type Tab = "all" | "certificates" | "aadhaar" | "bills" | "other";
type Mode = "cash" | "upi" | "card" | "credit";

const TABS: { id: Tab; label: string; match: (s: BillingService) => boolean }[] = [
  { id: "all", label: "tabAll", match: () => true },
  { id: "certificates", label: "tabCertificates", match: (s) => s.category === "e-district" && !s.variable_govt_fee },
  { id: "aadhaar", label: "tabAadhaar", match: (s) => s.category === "aadhaar" && !s.variable_govt_fee },
  { id: "bills", label: "tabBills", match: (s) => s.variable_govt_fee },
  { id: "other", label: "tabOther", match: (s) => s.category === "other" && !s.variable_govt_fee },
];

const TILE_ACCENT: Record<Tab, string> = {
  all: "border-l-zinc-200",
  certificates: "border-l-brand-500",
  aadhaar: "border-l-violet-500",
  bills: "border-l-amber-500",
  other: "border-l-zinc-400",
};

function tileTab(s: BillingService): Tab {
  return TABS.find((tab) => tab.id !== "all" && tab.match(s))?.id ?? "other";
}

function toAmount(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? round2(n) : 0;
}

let lineKey = 1;

export function InvoiceForm({
  services,
  slabs,
  isOwner,
  prefill,
}: {
  services: BillingService[];
  slabs: ChargeSlab[];
  isOwner: boolean;
  prefill: {
    customerName?: string;
    customerPhone?: string;
    requestId?: string | null;
    trackingCode?: string | null;
    serviceId?: string | null;
  };
}) {
  const { lang, t } = useTranslation();
  const tr = (key: string, vars?: Record<string, string | number>) => t(`billing.newBill.${key}`, vars);
  const name = (s: { name_en: string; name_ml: string }) => pickLang(lang, s.name_en, s.name_ml);
  const otherName = (s: { name_en: string; name_ml: string }) => (lang === "ml" ? s.name_en : s.name_ml);

  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(createInvoice, { error: null });

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [modal, setModal] = useState<Modal>(null);
  const [lines, setLines] = useState<Line[]>(() => {
    const service = services.find((s) => s.id === prefill.serviceId);
    return service && !service.variable_govt_fee ? [fixedLine(service)] : [];
  });
  const [customerOpen, setCustomerOpen] = useState(!!prefill.customerName);
  const [customerName, setCustomerName] = useState(prefill.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(prefill.customerPhone ?? "");
  const [mode, setMode] = useState<Mode>("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [reference, setReference] = useState("");
  const [partOpen, setPartOpen] = useState(false);
  const [paidNowInput, setPaidNowInput] = useState("");

  function fixedLine(service: BillingService): Line {
    return {
      key: lineKey++,
      serviceId: service.id,
      name_en: service.name_en,
      name_ml: service.name_ml,
      qty: 1,
      govtFee: Number(service.default_govt_fee),
      serviceCharge: serviceChargeFor(service, Number(service.default_govt_fee), slabs),
      overrideReason: "",
    };
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inTab = TABS.find((x) => x.id === tab)!.match;
    return services.filter(
      (s) => inTab(s) && (!q || s.name_en.toLowerCase().includes(q) || s.name_ml.toLowerCase().includes(q)),
    );
  }, [services, query, tab]);

  const govtTotal = round2(lines.reduce((sum, l) => sum + l.qty * l.govtFee, 0));
  const chargeTotal = round2(lines.reduce((sum, l) => sum + l.qty * l.serviceCharge, 0));
  const grandTotal = round2(govtTotal + chargeTotal);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  const paidNow = mode === "credit" ? 0 : partOpen ? Math.min(toAmount(paidNowInput), grandTotal) : grandTotal;
  const balance = round2(grandTotal - paidNow);
  const cashGivenAmount = toAmount(cashGiven);
  const change = round2(cashGivenAmount - paidNow);
  const phoneError = customerPhone.trim() !== "" && !isValidIndianPhone(customerPhone);

  function tapService(service: BillingService) {
    if (service.variable_govt_fee) {
      setModal({ kind: "amount", service });
      return;
    }
    setLines((current) => {
      const existing = current.find((l) => l.serviceId === service.id && !l.overrideReason);
      return existing
        ? current.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))
        : [...current, fixedLine(service)];
    });
  }

  function changeQty(key: number, delta: number) {
    setLines((current) =>
      current.flatMap((l) => (l.key !== key ? [l] : l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }])),
    );
  }

  const payload = JSON.stringify({
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    requestId: prefill.requestId ?? null,
    notes: "",
    items: lines.map((l) => ({
      serviceId: l.serviceId,
      description: l.name_en,
      qty: l.qty,
      govtFee: l.govtFee,
      serviceCharge: l.serviceCharge,
      overrideReason: l.overrideReason,
    })),
    payment: { mode, amount: paidNow, reference },
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:pb-0">
      {/* ---------------- Services ---------------- */}
      <section className="min-w-0">
        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("search")}
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white py-4 pl-14 pr-4 text-lg shadow-sm outline-none focus:border-brand-500"
          />
        </label>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((x) => {
            const count = services.filter(x.match).length;
            if (x.id !== "all" && count === 0) return null;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className={clsx(
                  "min-h-11 shrink-0 rounded-full px-4 text-base font-medium transition-colors",
                  tab === x.id ? "bg-brand-700 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100",
                )}
              >
                {tr(x.label)} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((s) => {
            const inBill = lines.filter((l) => l.serviceId === s.id).reduce((sum, l) => sum + l.qty, 0);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => tapService(s)}
                className={clsx(
                  "relative flex min-h-28 flex-col justify-between rounded-2xl border border-l-4 border-zinc-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98] hover:border-brand-300 hover:shadow-md",
                  TILE_ACCENT[tileTab(s)],
                  inBill > 0 && "ring-2 ring-brand-500",
                )}
              >
                {inBill > 0 && (
                  <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-700 px-2 text-sm font-bold text-white">
                    {inBill}
                  </span>
                )}
                <span className="pr-6">
                  <span className="block text-base font-semibold leading-snug text-zinc-900">{name(s)}</span>
                  {otherName(s) && otherName(s) !== name(s) && (
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{otherName(s)}</span>
                  )}
                </span>
                <span
                  className={clsx(
                    "mt-3 text-lg font-bold",
                    s.variable_govt_fee ? "text-amber-700" : "text-zinc-900",
                  )}
                >
                  {s.variable_govt_fee
                    ? tr("enterAmount")
                    : formatINR(Number(s.default_govt_fee) + Number(s.default_service_charge))}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setModal({ kind: "other" })}
            className="flex min-h-28 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-base font-semibold text-zinc-600 hover:border-brand-400 hover:text-brand-700"
          >
            {tr("otherItem")}
          </button>
        </div>
        {visible.length === 0 && <p className="mt-4 text-zinc-500">{tr("noResults")}</p>}
      </section>

      {/* ---------------- Bill ---------------- */}
      <form id="bill" action={formAction} className="lg:sticky lg:top-4">
        <input type="hidden" name="payload" value={payload} />
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-lg font-bold text-zinc-900">
              {tr("bill")}
              {itemCount > 0 && (
                <span className="ml-2 text-base font-normal text-zinc-500">· {tr("itemsCount", { count: itemCount })}</span>
              )}
            </h2>
            {lines.length > 0 && (
              <button type="button" onClick={() => setLines([])} className="text-sm font-medium text-zinc-500 hover:text-red-600">
                {tr("clear")}
              </button>
            )}
          </div>

          {prefill.trackingCode && (
            <p className="border-b border-zinc-100 bg-brand-50 px-5 py-2 text-sm text-brand-800">
              {tr("forRequest", { code: prefill.trackingCode })}
            </p>
          )}

          {lines.length === 0 ? (
            <p className="px-5 py-10 text-center text-base text-zinc-400">{tr("emptyBill")}</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {lines.map((l) => (
                <li key={l.key} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{name(l)}</p>
                      <p className="text-sm text-zinc-500">
                        {l.govtFee > 0 && `${tr("govt")} ${formatINR(l.govtFee)} + `}
                        {tr("charge")} {formatINR(l.serviceCharge)}
                        {l.qty > 1 && ` × ${l.qty}`}
                      </p>
                      {l.overrideReason && <p className="text-xs text-amber-700">✎ {l.overrideReason}</p>}
                    </div>
                    <p className="shrink-0 text-lg font-bold text-zinc-900">
                      {formatINR(l.qty * (l.govtFee + l.serviceCharge))}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQty(l.key, -1)}
                      aria-label="−"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    >
                      <MinusIcon />
                    </button>
                    <span className="w-8 text-center text-lg font-semibold">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(l.key, 1)}
                      aria-label="+"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    >
                      <PlusIcon />
                    </button>
                    <span className="flex-1" />
                    {isOwner && l.serviceId && (
                      <button
                        type="button"
                        onClick={() => setModal({ kind: "edit", line: l })}
                        aria-label={tr("editTitle")}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((x) => x.key !== l.key))}
                      aria-label={tr("clear")}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <XIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-zinc-100 px-5 py-4">
            {govtTotal > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>{tr("govt")}</span>
                <span>{formatINR(govtTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-zinc-500">
              <span>{tr("charge")}</span>
              <span>{formatINR(chargeTotal)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-zinc-900">{tr("total")}</span>
              <span className="text-3xl font-extrabold text-zinc-900">{formatINR(grandTotal)}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="border-t border-zinc-100 px-5 py-4">
            {customerOpen ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-600">{tr("customer")}</p>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={tr("name")}
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={tr("phone")}
                  inputMode="tel"
                  className={clsx(
                    "w-full rounded-xl border px-4 py-3 text-base",
                    phoneError ? "border-red-400" : "border-zinc-300",
                  )}
                />
                {phoneError && <p className="text-sm text-red-600">{tr("phoneInvalid")}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustomerOpen(true)}
                className="text-base font-medium text-brand-700 hover:underline"
              >
                + {tr("customer")}
              </button>
            )}
          </div>

          {/* Payment */}
          <div className="border-t border-zinc-100 px-5 py-4">
            <p className="text-sm font-medium text-zinc-600">{tr("payment")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={clsx(
                    "min-h-12 rounded-xl border-2 text-base font-semibold transition-colors",
                    mode === m
                      ? m === "credit"
                        ? "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  {tr(m === "credit" ? "later" : m)}
                </button>
              ))}
            </div>

            {mode === "credit" ? (
              <p className="mt-3 text-sm text-amber-700">{tr("laterNote")}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {mode === "cash" ? (
                  <div>
                    <input
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder={tr("cashGiven")}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
                    />
                    {cashGivenAmount > 0 && grandTotal > 0 && (
                      <p
                        className={clsx(
                          "mt-2 rounded-xl px-4 py-3 text-lg font-bold",
                          change >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
                        )}
                      >
                        {change >= 0 ? tr("returnChange") : tr("notEnough")}: {formatINR(Math.abs(change))}
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={tr("reference")}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
                  />
                )}

                {partOpen ? (
                  <div>
                    <input
                      value={paidNowInput}
                      onChange={(e) => setPaidNowInput(e.target.value)}
                      placeholder={tr("paidNow")}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
                    />
                  </div>
                ) : (
                  <button type="button" onClick={() => setPartOpen(true)} className="text-sm text-zinc-500 hover:underline">
                    {tr("partPayment")}
                  </button>
                )}
              </div>
            )}
            {balance > 0 && lines.length > 0 && (
              <p className="mt-3 text-base font-semibold text-amber-700">
                {tr("balanceDue")}: {formatINR(balance)}
              </p>
            )}
          </div>

          <div className="border-t border-zinc-100 p-4">
            {state.error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
            <button
              type="submit"
              disabled={pending || lines.length === 0 || phoneError}
              className="min-h-14 w-full rounded-xl bg-emerald-600 px-4 text-lg font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {pending ? tr("saving") : `${tr("save")} · ${formatINR(grandTotal)}`}
            </button>
          </div>
        </div>
      </form>

      {/* Phone/tablet: always-visible total that jumps to the bill */}
      {lines.length > 0 && (
        <a
          href="#bill"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-lg lg:hidden"
        >
          <span className="text-base">{tr("itemsCount", { count: itemCount })}</span>
          <span className="text-xl font-bold">
            {formatINR(grandTotal)} · {tr("viewBill")} ↓
          </span>
        </a>
      )}

      {modal?.kind === "amount" && (
        <AmountModal
          title={name(modal.service)}
          service={modal.service}
          slabs={slabs}
          tr={tr}
          onClose={() => setModal(null)}
          onAdd={(govt) => {
            const svc = modal.service;
            setLines((current) => [
              ...current,
              {
                key: lineKey++,
                serviceId: svc.id,
                name_en: svc.name_en,
                name_ml: svc.name_ml,
                qty: 1,
                govtFee: govt,
                serviceCharge: serviceChargeFor(svc, govt, slabs),
                overrideReason: "",
              },
            ]);
            setModal(null);
          }}
        />
      )}

      {modal?.kind === "other" && (
        <OtherItemModal
          tr={tr}
          onClose={() => setModal(null)}
          onAdd={(description, govt, charge) => {
            setLines((current) => [
              ...current,
              {
                key: lineKey++,
                serviceId: null,
                name_en: description,
                name_ml: description,
                qty: 1,
                govtFee: govt,
                serviceCharge: charge,
                overrideReason: "",
              },
            ]);
            setModal(null);
          }}
        />
      )}

      {modal?.kind === "edit" && (
        <EditModal
          line={modal.line}
          tr={tr}
          onClose={() => setModal(null)}
          onSave={(govt, charge, reason) => {
            setLines((current) =>
              current.map((l) =>
                l.key === modal.line.key ? { ...l, govtFee: govt, serviceCharge: charge, overrideReason: reason } : l,
              ),
            );
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

type Tr = (key: string, vars?: Record<string, string | number>) => string;

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

const bigInput =
  "w-full rounded-2xl border-2 border-zinc-300 px-4 py-4 text-2xl font-semibold outline-none focus:border-brand-500";

function ModalButtons({ tr, onClose, submitLabel, disabled }: { tr: Tr; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onClose}
        className="min-h-12 rounded-xl border border-zinc-300 text-base font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        {tr("cancel")}
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="min-h-12 rounded-xl bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-zinc-300"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function AmountModal({
  title,
  service,
  slabs,
  tr,
  onClose,
  onAdd,
}: {
  title: string;
  service: BillingService;
  slabs: ChargeSlab[];
  tr: Tr;
  onClose: () => void;
  onAdd: (govt: number) => void;
}) {
  const [value, setValue] = useState("");
  const govt = toAmount(value);
  const charge = serviceChargeFor(service, govt, slabs);

  return (
    <ModalShell title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (govt > 0) onAdd(govt);
        }}
      >
        <label className="block text-base text-zinc-600">
          {tr("amountTitle")}
          <span className="mt-0.5 block text-sm text-zinc-400">{tr("amountHint")}</span>
          <span className="relative mt-2 block">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400">₹</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              className={`${bigInput} pl-10`}
            />
          </span>
        </label>
        {govt > 0 && (
          <dl className="mt-4 space-y-1 rounded-2xl bg-zinc-50 p-4 text-base">
            <div className="flex justify-between text-zinc-600">
              <dt>{tr("serviceCharge")}</dt>
              <dd>{formatINR(charge)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold text-zinc-900">
              <dt>{tr("customerPays")}</dt>
              <dd>{formatINR(govt + charge)}</dd>
            </div>
          </dl>
        )}
        <ModalButtons tr={tr} onClose={onClose} submitLabel={tr("add")} disabled={govt <= 0} />
      </form>
    </ModalShell>
  );
}

function OtherItemModal({
  tr,
  onClose,
  onAdd,
}: {
  tr: Tr;
  onClose: () => void;
  onAdd: (description: string, govt: number, charge: number) => void;
}) {
  const [description, setDescription] = useState("");
  const [govt, setGovt] = useState("");
  const [charge, setCharge] = useState("");
  const total = toAmount(govt) + toAmount(charge);

  return (
    <ModalShell title={tr("otherTitle")} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (description.trim() && total > 0) onAdd(description.trim(), toAmount(govt), toAmount(charge));
        }}
      >
        <input
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={tr("otherDescription")}
          className="w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
        />
        <label className="block text-sm text-zinc-600">
          {tr("otherCharge")}
          <input
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
            inputMode="decimal"
            placeholder="₹"
            className="mt-1 w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {tr("otherGovt")}
          <input
            value={govt}
            onChange={(e) => setGovt(e.target.value)}
            inputMode="decimal"
            placeholder="₹ 0"
            className="mt-1 w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
          />
        </label>
        <ModalButtons tr={tr} onClose={onClose} submitLabel={tr("add")} disabled={!description.trim() || total <= 0} />
      </form>
    </ModalShell>
  );
}

function EditModal({
  line,
  tr,
  onClose,
  onSave,
}: {
  line: Line;
  tr: Tr;
  onClose: () => void;
  onSave: (govt: number, charge: number, reason: string) => void;
}) {
  const [govt, setGovt] = useState(String(line.govtFee));
  const [charge, setCharge] = useState(String(line.serviceCharge));
  const [reason, setReason] = useState(line.overrideReason);

  return (
    <ModalShell title={tr("editTitle")} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onSave(toAmount(govt), toAmount(charge), reason.trim());
        }}
      >
        <p className="font-semibold text-zinc-900">{line.name_en}</p>
        <label className="block text-sm text-zinc-600">
          {tr("govt")}
          <input
            value={govt}
            onChange={(e) => setGovt(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          {tr("charge")}
          <input
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
          />
        </label>
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={tr("reason")}
          className="w-full rounded-xl border-2 border-zinc-300 px-4 py-3 text-lg"
        />
        <ModalButtons tr={tr} onClose={onClose} submitLabel={tr("save2")} disabled={!reason.trim()} />
      </form>
    </ModalShell>
  );
}
