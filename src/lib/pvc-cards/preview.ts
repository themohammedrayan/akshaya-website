import { cellRect, type Grid, type Placement } from "./layout";
import { drawImageInto, type DrawableSource, type DrawTransform } from "./raster";
import type { FitMode } from "./types";

/**
 * The sheet preview, drawn on a canvas.
 *
 * This lives outside the React component so the preview can be rendered and
 * checked without a browser app around it, and so the picture on screen is
 * produced by exactly one piece of code.
 */

export type PreviewOptions = {
  grid: Grid;
  usedSlots: ReadonlySet<string>;
  placements: Placement[];
  front: DrawableSource | null;
  back: DrawableSource | null;
  frontTransform: DrawTransform;
  backTransform: DrawTransform;
  fitMode: FitMode;
  cropMarks: boolean;
  /** Preview pixels per millimetre. */
  pxPerMm: number;
};

export function drawSheetPreview(ctx: CanvasRenderingContext2D, options: PreviewOptions): void {
  const { grid, usedSlots, placements, front, back, frontTransform, backTransform, fitMode, cropMarks, pxPerMm } = options;

  const width = Math.round(grid.pageWidthMm * pxPerMm);
  const height = Math.round(grid.pageHeightMm * pxPerMm);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // The sheet of paper.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d4d4d8";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // The area the printer can actually reach.
  ctx.strokeStyle = "#e4e4e7";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(
    grid.marginMm * pxPerMm,
    grid.marginMm * pxPerMm,
    (grid.pageWidthMm - 2 * grid.marginMm) * pxPerMm,
    (grid.pageHeightMm - 2 * grid.marginMm) * pxPerMm,
  );
  ctx.setLineDash([]);

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const rect = cellRect(grid, col, row);
      const x = rect.xMm * pxPerMm;
      const y = rect.yMm * pxPerMm;
      const w = rect.widthMm * pxPerMm;
      const h = rect.heightMm * pxPerMm;
      const key = `${col},${row}`;

      if (usedSlots.has(key)) {
        ctx.fillStyle = "#e4e4e7";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
      } else {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    }
  }

  for (const placement of placements) {
    const image = placement.side === "front" ? front : back;
    if (!image) continue;
    const transform = placement.side === "front" ? frontTransform : backTransform;

    const x = placement.xMm * pxPerMm;
    const y = placement.yMm * pxPerMm;
    const w = placement.widthMm * pxPerMm;
    const h = placement.heightMm * pxPerMm;

    ctx.save();
    ctx.translate(x, y);
    drawImageInto(ctx, image, w, h, fitMode, transform);
    ctx.restore();

    if (cropMarks) {
      drawPreviewCropMarks(ctx, x, y, w, h, pxPerMm);
    }
  }

  // Outline the cards this job fills, on top of the pictures, so the
  // operator can tell them apart from what is already on the sheet.
  ctx.strokeStyle = "#5244a8";
  ctx.lineWidth = 2;
  for (const placement of placements) {
    const rect = cellRect(grid, placement.col, placement.row);
    ctx.strokeRect(
      rect.xMm * pxPerMm,
      rect.yMm * pxPerMm,
      rect.widthMm * pxPerMm,
      rect.heightMm * pxPerMm,
    );
  }

}

/** Corner ticks matching the crop marks drawn into the PDF. */
function drawPreviewCropMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pxPerMm: number,
): void {
  const arm = 3 * pxPerMm;
  const gap = 0.6 * pxPerMm;

  ctx.strokeStyle = "#b8b8bd";
  ctx.lineWidth = 1;

  const corners = [
    { x, y, dx: -1, dy: -1 },
    { x: x + width, y, dx: 1, dy: -1 },
    { x, y: y + height, dx: -1, dy: 1 },
    { x: x + width, y: y + height, dx: 1, dy: 1 },
  ];

  for (const corner of corners) {
    ctx.beginPath();
    ctx.moveTo(corner.x + corner.dx * gap, corner.y);
    ctx.lineTo(corner.x + corner.dx * (gap + arm), corner.y);
    ctx.moveTo(corner.x, corner.y + corner.dy * gap);
    ctx.lineTo(corner.x, corner.y + corner.dy * (gap + arm));
    ctx.stroke();
  }
}
