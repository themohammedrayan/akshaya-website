"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cellKey, computeGrid, planPlacement } from "@/lib/pvc-cards/layout";
import { buildSheetPdf, buildTestGridPdf } from "@/lib/pvc-cards/pdf";
import { rasterizeCard, shouldAutoRotate } from "@/lib/pvc-cards/raster";
import {
  CARD_PRESETS,
  PAGE_PRESETS,
  defaultGeometry,
  findCardPreset,
  findPagePreset,
} from "@/lib/pvc-cards/presets";
import {
  createSheet,
  getServerSnapshot,
  getSnapshot,
  nextSheetName,
  subscribe,
  updateState,
} from "@/lib/pvc-cards/storage";
import type { Anchor, FitMode, Orientation, SheetGeometry } from "@/lib/pvc-cards/types";
import { ImageSlot } from "./ImageSlot";
import { PagePreview } from "./PagePreview";
import { SheetManager } from "./SheetManager";
import { NumberField, SegmentedControl, SelectField, Section, Toggle } from "./fields";
import type { DrawTransform, LoadedImage } from "./types";

/** Rotation to apply, including the automatic one for photos taken upright. */
function effectiveRotate(
  image: LoadedImage,
  autoRotate: boolean,
  cardWidthMm: number,
  cardHeightMm: number,
): 0 | 90 | 180 | 270 {
  const base = autoRotate && shouldAutoRotate(image.width, image.height, cardWidthMm, cardHeightMm) ? 90 : 0;
  return ((((base + image.rotate) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
}

export function PvcCardPrinter() {
  const { t } = useTranslation();
  const tr = (key: string, vars?: Record<string, string | number>) => t(`pvcCards.${key}`, vars);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { job, calibration, sheets, activeSheetId } = stored;

  const [front, setFront] = useState<LoadedImage | null>(null);
  const [back, setBack] = useState<LoadedImage | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfKind, setPdfKind] = useState<"cards" | "test" | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pdfUrlRef = useRef<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  /** False until the browser's stored state has been read. */
  const ready = sheets.length > 0;

  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId) ?? null;
  const geometry = activeSheet?.geometry ?? defaultGeometry();

  const grid = useMemo(() => computeGrid(geometry, job.anchor), [geometry, job.anchor]);
  const usedSlots = useMemo(() => new Set(activeSheet?.usedSlots ?? []), [activeSheet]);
  const plan = useMemo(
    () => planPlacement(grid, job.anchor, usedSlots, job.copies, back !== null),
    [grid, job.anchor, usedSlots, job.copies, back],
  );

  const frontTransform = useMemo<DrawTransform>(
    () =>
      front
        ? {
            rotate: effectiveRotate(front, job.autoRotate, geometry.cardWidthMm, geometry.cardHeightMm),
            mirror: front.mirror,
          }
        : { rotate: 0, mirror: false },
    [front, job.autoRotate, geometry.cardWidthMm, geometry.cardHeightMm],
  );

  const backTransform = useMemo<DrawTransform>(
    () =>
      back
        ? {
            rotate: effectiveRotate(back, job.autoRotate, geometry.cardWidthMm, geometry.cardHeightMm),
            mirror: back.mirror,
          }
        : { rotate: 0, mirror: false },
    [back, job.autoRotate, geometry.cardWidthMm, geometry.cardHeightMm],
  );

  /** Everything the PDF depends on, so a stale preview can be spotted. */
  const signature = useMemo(
    () =>
      JSON.stringify({
        cells: plan.cells,
        geometry,
        fit: job.fitMode,
        front: frontTransform,
        back: backTransform,
        calibration,
        cropMarks: job.cropMarks,
        dpi: job.dpi,
      }),
    [plan.cells, geometry, job.fitMode, frontTransform, backTransform, calibration, job.cropMarks, job.dpi],
  );

  const showPdf = useCallback((url: string, kind: "cards" | "test") => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = url;
    setPdfUrl(url);
    setPdfKind(kind);
  }, []);

  const buildPdfBytes = useCallback(async () => {
    const frontRaster = front
      ? await rasterizeCard(
          front.bitmap,
          geometry.cardWidthMm,
          geometry.cardHeightMm,
          job.dpi,
          job.fitMode,
          frontTransform,
          job.losslessPng,
        )
      : null;
    const backRaster = back
      ? await rasterizeCard(
          back.bitmap,
          geometry.cardWidthMm,
          geometry.cardHeightMm,
          job.dpi,
          job.fitMode,
          backTransform,
          job.losslessPng,
        )
      : null;

    return buildSheetPdf({
      pageWidthMm: geometry.pageWidthMm,
      pageHeightMm: geometry.pageHeightMm,
      placements: plan.placements,
      front: frontRaster,
      back: backRaster,
      calibration,
      cropMarks: job.cropMarks,
    });
  }, [front, back, geometry, job.dpi, job.fitMode, job.losslessPng, frontTransform, backTransform, plan.placements, calibration, job.cropMarks]);

  async function handleGenerate(download: boolean) {
    if (!front) {
      setError(tr("error.noPhoto"));
      return;
    }
    if (plan.placedPairs === 0) {
      setError(tr("error.noSpace"));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const bytes = await buildPdfBytes();
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const blob = new Blob([copy.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      showPdf(url, "cards");
      setGeneratedFor(signature);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `pvc-cards-${new Date().toISOString().slice(0, 10)}.pdf`;
        link.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleTestGrid() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const bytes = await buildTestGridPdf(
        geometry.pageWidthMm,
        geometry.pageHeightMm,
        geometry.cardWidthMm,
        geometry.cardHeightMm,
        calibration,
      );
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const blob = new Blob([copy.buffer as ArrayBuffer], { type: "application/pdf" });
      showPdf(URL.createObjectURL(blob), "test");
      setGeneratedFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    const frame = frameRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener");
    }
  }

  function handleMarkUsed() {
    if (!activeSheet || plan.cells.length === 0) return;
    updateState({
      sheets: sheets.map((sheet) =>
        sheet.id === activeSheet.id
          ? { ...sheet, usedSlots: Array.from(new Set([...sheet.usedSlots, ...plan.cells])) }
          : sheet,
      ),
    });
    setNotice(tr("print.marked", { count: plan.placedPairs }));
  }

  function handleToggleSlot(col: number, row: number) {
    if (!activeSheet) return;
    const key = cellKey(col, row);
    updateState({
      sheets: sheets.map((sheet) =>
        sheet.id === activeSheet.id
          ? {
              ...sheet,
              usedSlots: sheet.usedSlots.includes(key)
                ? sheet.usedSlots.filter((slot) => slot !== key)
                : [...sheet.usedSlots, key],
            }
          : sheet,
      ),
    });
  }

  function updateGeometry(patch: Partial<SheetGeometry>) {
    const sheet = activeSheet;
    if (!sheet) return;
    const next = { ...sheet.geometry, ...patch };
    const changed = (Object.keys(patch) as (keyof SheetGeometry)[]).some(
      (key) => sheet.geometry[key] !== next[key],
    );
    if (changed && sheet.usedSlots.length > 0 && !window.confirm(tr("error.geometryChange"))) return;
    updateState({
      sheets: sheets.map((item) =>
        item.id === sheet.id ? { ...item, geometry: next, usedSlots: changed ? [] : item.usedSlots } : item,
      ),
    });
  }

  function applyCardPreset(key: string) {
    const preset = findCardPreset(key);
    updateGeometry({
      cardKey: preset.key,
      cardWidthMm: preset.widthMm,
      cardHeightMm: preset.heightMm,
    });
  }

  function applyPagePreset(key: string) {
    const preset = findPagePreset(key);
    const landscape = geometry.orientation === "landscape";
    updateGeometry({
      pageKey: preset.key,
      pageWidthMm: landscape ? preset.heightMm : preset.widthMm,
      pageHeightMm: landscape ? preset.widthMm : preset.heightMm,
    });
  }

  function toggleOrientation() {
    const orientation: Orientation = geometry.orientation === "portrait" ? "landscape" : "portrait";
    updateGeometry({
      orientation,
      pageWidthMm: geometry.pageHeightMm,
      pageHeightMm: geometry.pageWidthMm,
    });
  }

  async function loadFiles(files: FileList | null, side: "front" | "back") {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(tr("error.notAnImage"));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const loaded: LoadedImage = {
        id: `${side}_${Date.now()}`,
        name: file.name,
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        rotate: 0,
        mirror: false,
      };
      if (side === "front") setFront(loaded);
      else setBack(loaded);
      setError(null);
    } catch {
      setError(tr("error.cannotRead"));
    }
  }

  function rotateImage(side: "front" | "back") {
    const update = (current: LoadedImage | null) =>
      current ? { ...current, rotate: (((current.rotate + 90) % 360) as 0 | 90 | 180 | 270) } : current;
    if (side === "front") setFront(update);
    else setBack(update);
  }

  function mirrorImage(side: "front" | "back") {
    const update = (current: LoadedImage | null) =>
      current ? { ...current, mirror: !current.mirror } : current;
    if (side === "front") setFront(update);
    else setBack(update);
  }

  function mirrorBoth() {
    setFront((current) => (current ? { ...current, mirror: !current.mirror } : current));
    setBack((current) => (current ? { ...current, mirror: !current.mirror } : current));
  }

  function handleNewSheet() {
    const sheet = createSheet(nextSheetName(sheets), geometry);
    updateState({ sheets: [...sheets, sheet], activeSheetId: sheet.id });
    setNotice(null);
  }

  function handleResetSheet() {
    if (!activeSheet) return;
    if (!window.confirm(tr("sheets.resetConfirm"))) return;
    updateState({
      sheets: sheets.map((sheet) => (sheet.id === activeSheet.id ? { ...sheet, usedSlots: [] } : sheet)),
    });
  }

  const stale = pdfKind === "cards" && generatedFor !== null && generatedFor !== signature;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[19rem_minmax(0,1fr)_19rem] lg:items-start">
      {/* Settings */}
      <div className="space-y-6">
        <Section title={tr("photos.title")}>
          <ImageSlot
            label={tr("photos.front")}
            image={front}
            transform={frontTransform}
            fitMode={job.fitMode}
            chooseLabel={tr("photos.choose")}
            cameraLabel={tr("photos.camera")}
            dropLabel={tr("photos.drop")}
            clearLabel={tr("photos.clear")}
            rotateLabel={tr("photos.rotate")}
            mirrorLabel={tr("photos.mirror")}
            onFiles={(files) => loadFiles(files, "front")}
            onClear={() => setFront(null)}
            onRotate={() => rotateImage("front")}
            onMirror={() => mirrorImage("front")}
          />
          <ImageSlot
            label={tr("photos.back")}
            image={back}
            transform={backTransform}
            fitMode={job.fitMode}
            chooseLabel={tr("photos.choose")}
            cameraLabel={tr("photos.camera")}
            dropLabel={tr("photos.drop")}
            clearLabel={tr("photos.clear")}
            rotateLabel={tr("photos.rotate")}
            mirrorLabel={tr("photos.mirror")}
            onFiles={(files) => loadFiles(files, "back")}
            onClear={() => setBack(null)}
            onRotate={() => rotateImage("back")}
            onMirror={() => mirrorImage("back")}
          />
          {(front || back) && (
            <button
              type="button"
              onClick={mirrorBoth}
              className="min-h-11 w-full rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {tr("photos.mirrorBoth")}
            </button>
          )}
          <p className="text-xs text-zinc-500">{tr("photos.privacy")}</p>
        </Section>

        <Section title={tr("card.title")}>
          <SelectField label={tr("card.preset")} value={geometry.cardKey} onChange={applyCardPreset}>
            {CARD_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={tr("card.width")}
              value={geometry.cardWidthMm}
              step={0.1}
              min={5}
              onChange={(cardWidthMm) => updateGeometry({ cardKey: "custom", cardWidthMm })}
            />
            <NumberField
              label={tr("card.height")}
              value={geometry.cardHeightMm}
              step={0.1}
              min={5}
              onChange={(cardHeightMm) => updateGeometry({ cardKey: "custom", cardHeightMm })}
            />
          </div>
        </Section>

        <Section title={tr("page.title")}>
          <SelectField label={tr("page.preset")} value={geometry.pageKey} onChange={applyPagePreset}>
            {PAGE_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </SelectField>
          <SegmentedControl
            label={tr("page.orientation")}
            value={geometry.orientation}
            onChange={toggleOrientation}
            options={[
              { value: "portrait" as Orientation, label: tr("page.portrait") },
              { value: "landscape" as Orientation, label: tr("page.landscape") },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={tr("page.margin")}
              value={geometry.marginMm}
              step={0.5}
              min={0}
              onChange={(marginMm) => updateGeometry({ marginMm })}
            />
            <NumberField
              label={tr("page.gap")}
              value={geometry.gapMm}
              step={0.5}
              min={0}
              onChange={(gapMm) => updateGeometry({ gapMm })}
            />
          </div>
        </Section>

        <Section title={tr("layout.title")}>
          <NumberField
            label={tr("layout.copies")}
            value={job.copies}
            step={1}
            min={1}
            onChange={(copies) => updateState({ job: { ...job, copies: Math.max(1, Math.round(copies)) } })}
          />
          <SegmentedControl<FitMode>
            label={tr("layout.fit")}
            value={job.fitMode}
            onChange={(fitMode) => updateState({ job: { ...job, fitMode } })}
            options={[
              { value: "cover", label: tr("layout.fitCover") },
              { value: "contain", label: tr("layout.fitContain") },
              { value: "stretch", label: tr("layout.fitStretch") },
            ]}
          />
          <SegmentedControl<Anchor>
            label={tr("layout.anchor")}
            value={job.anchor}
            onChange={(anchor) => updateState({ job: { ...job, anchor } })}
            options={[
              { value: "bottom", label: tr("layout.anchorBottom") },
              { value: "top", label: tr("layout.anchorTop") },
              { value: "left", label: tr("layout.anchorLeft") },
              { value: "right", label: tr("layout.anchorRight") },
            ]}
          />
        </Section>

        <Section title={tr("quality.title")}>
          <SegmentedControl
            label={tr("quality.dpi")}
            value={String(job.dpi)}
            onChange={(value) => updateState({ job: { ...job, dpi: Number(value) as 300 | 600 } })}
            options={[
              { value: "300", label: tr("quality.dpi300") },
              { value: "600", label: tr("quality.dpi600") },
            ]}
          />
          <Toggle
            label={tr("quality.autoRotate")}
            checked={job.autoRotate}
            onChange={(autoRotate) => updateState({ job: { ...job, autoRotate } })}
          />
          <Toggle
            label={tr("quality.lossless")}
            checked={job.losslessPng}
            onChange={(losslessPng) => updateState({ job: { ...job, losslessPng } })}
          />
          <Toggle
            label={tr("quality.cropMarks")}
            checked={job.cropMarks}
            onChange={(cropMarks) => updateState({ job: { ...job, cropMarks } })}
          />
        </Section>
      </div>

      {/* Preview and printing */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">{tr("print.instructionsTitle")}</p>
          <p className="mt-1">{tr("print.instructions")}</p>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-zinc-900">{tr("preview.title")}</h2>
            <p className="text-sm text-zinc-500">
              {tr("preview.summary", {
                cols: grid.cols,
                rows: grid.rows,
                placed: plan.placedPairs,
                requested: job.copies,
              })}
            </p>
          </div>

          {plan.overflowPairs > 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {tr("print.overflow", { placed: plan.placedPairs, requested: job.copies })}
            </p>
          )}

          <div className="mt-4 flex justify-center">
            <PagePreview
              grid={grid}
              usedSlots={usedSlots}
              placements={plan.placements}
              front={front}
              back={back}
              frontTransform={frontTransform}
              backTransform={backTransform}
              fitMode={job.fitMode}
              cropMarks={job.cropMarks}
              onToggleSlot={handleToggleSlot}
            />
          </div>

          <p className="mt-3 text-center text-xs text-zinc-500">{tr("preview.hint")}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy || !ready}
              onClick={() => handleGenerate(false)}
              className="min-h-12 rounded-xl bg-brand-700 px-4 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-zinc-300"
            >
              {busy ? tr("print.busy") : tr("print.prepare")}
            </button>
            <button
              type="button"
              disabled={busy || !ready}
              onClick={() => handleGenerate(true)}
              className="min-h-12 rounded-xl border border-zinc-300 px-4 text-base font-semibold text-zinc-700 hover:bg-zinc-50 disabled:bg-zinc-300"
            >
              {tr("print.download")}
            </button>
          </div>

          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          {pdfKind === "cards" && plan.cells.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3">
              <p className="text-sm text-zinc-700">{tr("print.markUsedQuestion", { count: plan.placedPairs })}</p>
              <button
                type="button"
                onClick={handleMarkUsed}
                className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {tr("print.markUsedYes")}
              </button>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="min-h-11 rounded-xl px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                {tr("print.markUsedNo")}
              </button>
            </div>
          )}
        </section>

        {pdfUrl && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900">
                {pdfKind === "test" ? tr("print.testPreview") : tr("print.pdfPreview")}
              </h2>
              <button
                type="button"
                onClick={handlePrint}
                className="min-h-12 rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white hover:bg-emerald-700"
              >
                {tr("print.printNow")}
              </button>
            </div>
            {stale && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{tr("print.stale")}</p>}
            <iframe
              ref={frameRef}
              src={pdfUrl}
              title={tr("print.pdfPreview")}
              className="mt-3 h-[32rem] w-full rounded-xl border border-zinc-300 bg-zinc-50"
            />
          </section>
        )}
      </div>

      {/* Sheets */}
      <div className="space-y-6">
        <SheetManager
          sheets={sheets}
          activeSheetId={activeSheetId}
          grid={grid}
          calibration={calibration}
          onSelect={(id) => updateState({ activeSheetId: id })}
          onNew={handleNewSheet}
          onReset={handleResetSheet}
          onCalibrationChange={(next) => updateState({ calibration: next })}
          onTestGrid={handleTestGrid}
        />
        <p className="px-1 text-xs text-zinc-500">{tr("sheets.hint")}</p>
      </div>
    </div>
  );
}
