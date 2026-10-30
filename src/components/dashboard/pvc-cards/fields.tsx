"use client";

import clsx from "clsx";

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
        {action}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function NumberField({
  label,
  value,
  step = 1,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm text-zinc-600">
      {label}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-zinc-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900"
      >
        {children}
      </select>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="block text-sm text-zinc-600">{label}</span>
      <div className="mt-1 grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-zinc-100 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              "min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors",
              value === option.value
                ? "bg-brand-700 text-white"
                : "text-zinc-600 hover:bg-white hover:text-zinc-900",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium text-zinc-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-zinc-300 transition-colors checked:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        style={{
          backgroundImage: checked
            ? "radial-gradient(circle at 75% 50%, #ffffff 0 40%, transparent 41%)"
            : "radial-gradient(circle at 25% 50%, #ffffff 0 40%, transparent 41%)",
        }}
      />
    </label>
  );
}
