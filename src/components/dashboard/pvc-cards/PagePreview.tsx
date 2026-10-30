"use client";

import { useEffect, useRef } from "react";
import { cellAtPoint, type Grid, type Placement } from "@/lib/pvc-cards/layout";
import { drawSheetPreview } from "@/lib/pvc-cards/preview";
import type { FitMode } from "@/lib/pvc-cards/types";
import type { DrawTransform, LoadedImage } from "./types";

/**
 * Preview pixels per millimetre. Fixed rather than derived from the element's
 * size, so the preview is a stable, predictable picture of the sheet.
 */
const PX_PER_MM = 4;

type Props = {
  grid: Grid;
  usedSlots: ReadonlySet<string>;
  /** Cards the current job would fill. */
  placements: Placement[];
  front: LoadedImage | null;
  back: LoadedImage | null;
  frontTransform: DrawTransform;
  backTransform: DrawTransform;
  fitMode: FitMode;
  cropMarks: boolean;
  onToggleSlot?: (col: number, row: number) => void;
};

export function PagePreview({
  grid,
  usedSlots,
  placements,
  front,
  back,
  frontTransform,
  backTransform,
  fitMode,
  cropMarks,
  onToggleSlot,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.round(grid.pageWidthMm * PX_PER_MM);
    const height = Math.round(grid.pageHeightMm * PX_PER_MM);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    drawSheetPreview(ctx, {
      grid,
      usedSlots,
      placements,
      front: front?.bitmap ?? null,
      back: back?.bitmap ?? null,
      frontTransform,
      backTransform,
      fitMode,
      cropMarks,
      pxPerMm: PX_PER_MM,
    });
  }, [grid, usedSlots, placements, front, back, frontTransform, backTransform, fitMode, cropMarks]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!onToggleSlot) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const xMm = ((event.clientX - bounds.left) * (canvas.width / bounds.width)) / PX_PER_MM;
    const yMm = ((event.clientY - bounds.top) * (canvas.height / bounds.height)) / PX_PER_MM;

    const hit = cellAtPoint(grid, xMm, yMm);
    if (hit) onToggleSlot(hit.col, hit.row);
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full max-w-[560px] rounded-lg border border-zinc-300 bg-white shadow-sm"
      aria-label="Sheet preview. Click a slot to mark it as used or free."
    />
  );
}
