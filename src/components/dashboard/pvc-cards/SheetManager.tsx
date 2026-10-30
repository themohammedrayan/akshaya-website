"use client";

import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Grid } from "@/lib/pvc-cards/layout";
import type { Calibration, Sheet } from "@/lib/pvc-cards/types";
import { NumberField } from "./fields";

type Props = {
  sheets: Sheet[];
  activeSheetId: string;
  grid: Grid;
  calibration: Calibration;
  onSelect: (id: string) => void;
  onNew: () => void;
  onReset: () => void;
  onCalibrationChange: (calibration: Calibration) => void;
  onTestGrid: () => void;
};

export function SheetManager({
  sheets,
  activeSheetId,
  grid,
  calibration,
  onSelect,
  onNew,
  onReset,
  onCalibrationChange,
  onTestGrid,
}: Props) {
  const { t } = useTranslation();
  const tr = (key: string, vars?: Record<string, string | number>) => t(`pvcCards.sheets.${key}`, vars);

  const totalSlots = grid.cols * grid.rows;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900">{tr("title")}</h2>
        <button
          type="button"
          onClick={onNew}
          className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          {tr("newSheet")}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {sheets.map((sheet) => {
          const active = sheet.id === activeSheetId;
          const fillPercent = totalSlots > 0 ? Math.round((sheet.usedSlots.length / totalSlots) * 100) : 0;
          return (
            <li key={sheet.id}>
              <button
                type="button"
                onClick={() => onSelect(sheet.id)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-brand-600 bg-brand-50"
                    : "border-zinc-200 bg-white hover:border-brand-400 hover:bg-brand-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-zinc-900">{sheet.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {tr("fill", { used: sheet.usedSlots.length, total: totalSlots, percent: fillPercent })}
                  </span>
                </span>
                {active && <span className="shrink-0 text-xs font-semibold text-brand-700">{tr("current")}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onReset}
        className="mt-3 text-sm font-medium text-red-600 hover:underline"
      >
        {tr("reset")}
      </button>

      <div className="mt-5 border-t border-zinc-100 pt-5">
        <h3 className="text-base font-bold text-zinc-900">{tr("calibrationTitle")}</h3>
        <p className="mt-1 text-xs text-zinc-500">{tr("calibrationHint")}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <NumberField
            label={tr("offsetX")}
            value={calibration.offsetXMm}
            step={0.1}
            onChange={(offsetXMm) => onCalibrationChange({ ...calibration, offsetXMm })}
          />
          <NumberField
            label={tr("offsetY")}
            value={calibration.offsetYMm}
            step={0.1}
            onChange={(offsetYMm) => onCalibrationChange({ ...calibration, offsetYMm })}
          />
          <NumberField
            label={tr("scale")}
            value={calibration.scale}
            step={0.001}
            onChange={(scale) => onCalibrationChange({ ...calibration, scale })}
          />
        </div>

        <button
          type="button"
          onClick={onTestGrid}
          className="mt-3 min-h-11 w-full rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          {tr("testGrid")}
        </button>
      </div>
    </section>
  );
}
