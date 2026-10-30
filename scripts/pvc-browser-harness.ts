/**
 * Browser-side checks for the PVC card printer.
 *
 * The image pipeline (crop, fit, rotate, mirror) is the other half of the
 * geometry that has to be right, and it only exists in a browser - a canvas
 * and createImageBitmap. This harness runs in headless Chrome and reports
 * what it found, so `npm run check:pvc:browser` can assert on it.
 */
import { buildSheetPdf } from "@/lib/pvc-cards/pdf";
import { computeGrid, planPlacement } from "@/lib/pvc-cards/layout";
import { drawSheetPreview } from "@/lib/pvc-cards/preview";
import { rasterizeCard, type DrawableSource } from "@/lib/pvc-cards/raster";
import type { FitMode } from "@/lib/pvc-cards/types";

export type BrowserResult = { name: string; ok: boolean; detail?: string };

const results: BrowserResult[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
}

/** A source image with a different colour in each quadrant. */
function quadrantSource(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ff0000"; // top left
  ctx.fillRect(0, 0, 100, 50);
  ctx.fillStyle = "#00ff00"; // top right
  ctx.fillRect(100, 0, 100, 50);
  ctx.fillStyle = "#0000ff"; // bottom left
  ctx.fillRect(0, 50, 100, 50);
  ctx.fillStyle = "#ffff00"; // bottom right
  ctx.fillRect(100, 50, 100, 50);
  return canvas;
}

async function decode(bytes: Uint8Array, isPng: boolean): Promise<ImageBitmap> {
  const blob = new Blob([bytes as BlobPart], { type: isPng ? "image/png" : "image/jpeg" });
  return createImageBitmap(blob);
}

/** Reads the colour at the centre of a quadrant of the rendered image. */
async function quadrantColour(bitmap: ImageBitmap, quadrant: string): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);

  const x = quadrant.includes("left") ? Math.round(bitmap.width * 0.25) : Math.round(bitmap.width * 0.75);
  const y = quadrant.includes("top") ? Math.round(bitmap.height * 0.25) : Math.round(bitmap.height * 0.75);
  const data = ctx.getImageData(x, y, 1, 1).data;
  return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
}

const COLOURS = {
  "top left": "rgb(255, 0, 0)",
  "top right": "rgb(0, 255, 0)",
  "bottom left": "rgb(0, 0, 255)",
  "bottom right": "rgb(255, 255, 0)",
};

/** Reads one pixel's colour. */
async function pixelAt(bitmap: ImageBitmap, x: number, y: number): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(x, y, 1, 1).data;
  return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
}

async function render(
  source: DrawableSource,
  fit: FitMode,
  transform: { rotate: 0 | 90 | 180 | 270; mirror: boolean },
) {
  const raster = await rasterizeCard(source, 85.6, 54, 300, fit, transform, true);
  return { raster, bitmap: await decode(raster.bytes, raster.isPng) };
}

export type BrowserPayload = {
  results: BrowserResult[];
  pdf: string;
  /** A PNG of the sheet preview. */
  preview: string;
  /** Where each card was meant to land, in millimetres from the top left. */
  placements: { xMm: number; yMm: number; wMm: number; hMm: number }[];
};

export async function runBrowserChecks(): Promise<BrowserPayload> {
  const source = quadrantSource();
  const bitmap = await createImageBitmap(source);

  // Resolution: CR80 at 300 dpi is 1011 x 638 pixels.
  const at300 = await rasterizeCard(bitmap, 85.6, 54, 300, "stretch", { rotate: 0, mirror: false }, true);
  check(
    "CR80 at 300 dpi is 1011 x 638 px",
    at300.pixelWidth === 1011 && at300.pixelHeight === 638,
    `got ${at300.pixelWidth} x ${at300.pixelHeight}`,
  );

  const at600 = await rasterizeCard(bitmap, 85.6, 54, 600, "stretch", { rotate: 0, mirror: false }, true);
  check(
    "CR80 at 600 dpi is 2022 x 1276 px",
    at600.pixelWidth === 2022 && at600.pixelHeight === 1276,
    `got ${at600.pixelWidth} x ${at600.pixelHeight}`,
  );

  // No transform: quadrants stay where they were.
  const plain = await render(bitmap, "stretch", { rotate: 0, mirror: false });
  for (const [quadrant, expected] of Object.entries(COLOURS)) {
    const actual = await quadrantColour(plain.bitmap, quadrant);
    check(`unaltered: ${quadrant} keeps its colour`, actual === expected, `got ${actual}`);
  }

  // Mirrored: left and right swap.
  const mirrored = await render(bitmap, "stretch", { rotate: 0, mirror: true });
  const mirroredTopLeft = await quadrantColour(mirrored.bitmap, "top left");
  const mirroredTopRight = await quadrantColour(mirrored.bitmap, "top right");
  check(
    "mirrored: top left and top right swap",
    mirroredTopLeft === COLOURS["top right"] && mirroredTopRight === COLOURS["top left"],
    `got ${mirroredTopLeft} and ${mirroredTopRight}`,
  );

  // Rotated 90 degrees clockwise: the original top left ends up top right.
  const rotated = await render(bitmap, "stretch", { rotate: 90, mirror: false });
  const rotatedTopLeft = await quadrantColour(rotated.bitmap, "top left");
  const rotatedTopRight = await quadrantColour(rotated.bitmap, "top right");
  const rotatedBottomLeft = await quadrantColour(rotated.bitmap, "bottom left");
  const rotatedBottomRight = await quadrantColour(rotated.bitmap, "bottom right");
  check(
    "rotated 90: quadrants move clockwise",
    rotatedTopLeft === COLOURS["bottom left"] &&
      rotatedTopRight === COLOURS["top left"] &&
      rotatedBottomLeft === COLOURS["bottom right"] &&
      rotatedBottomRight === COLOURS["top right"],
    `got ${rotatedTopLeft}, ${rotatedTopRight}, ${rotatedBottomLeft}, ${rotatedBottomRight}`,
  );

  // Contain leaves white bars where the image does not reach.
  const contained = await render(bitmap, "contain", { rotate: 0, mirror: false });
  const containedCorner = await pixelAt(contained.bitmap, 2, 2);
  check("contain leaves a white bar", containedCorner === "rgb(255, 255, 255)", `got ${containedCorner}`);
  const containedBottomLeft = await quadrantColour(contained.bitmap, "bottom left");
  check(
    "contain keeps the image in the middle",
    containedBottomLeft === COLOURS["bottom left"],
    `got ${containedBottomLeft}`,
  );

  // Cover fills the card completely, with no bars.
  const covered = await render(bitmap, "cover", { rotate: 0, mirror: false });
  const coveredCorner = await pixelAt(covered.bitmap, 2, 2);
  check("cover leaves no white bar", coveredCorner !== "rgb(255, 255, 255)", `got ${coveredCorner}`);
  const coveredTopLeft = await quadrantColour(covered.bitmap, "top left");
  check(
    "cover keeps the centre of the photo",
    coveredTopLeft === COLOURS["top left"],
    `got ${coveredTopLeft}`,
  );

  // A real sheet PDF, with the raster embedded once and drawn five times.
  const geometry = {
    cardKey: "cr80",
    pageKey: "a4",
    pageWidthMm: 210,
    pageHeightMm: 297,
    orientation: "portrait" as const,
    cardWidthMm: 85.6,
    cardHeightMm: 54,
    marginMm: 5,
    gapMm: 2,
  };
  const grid = computeGrid(geometry, "bottom");
  // Two slots on the bottom row were printed on an earlier job.
  const usedSlots = new Set(["0,4", "1,4"]);
  const plan = planPlacement(grid, "bottom", usedSlots, 5, false);
  const bytes = await buildSheetPdf({
    pageWidthMm: 210,
    pageHeightMm: 297,
    placements: plan.placements,
    front: { bytes: at300.bytes, isPng: at300.isPng },
    back: null,
    calibration: { offsetXMm: 0, offsetYMm: 0, scale: 1 },
    cropMarks: false,
  });

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);

  // A picture of the sheet preview, so it can be eyeballed.
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = Math.round(grid.pageWidthMm * 4);
  previewCanvas.height = Math.round(grid.pageHeightMm * 4);
  const previewCtx = previewCanvas.getContext("2d")!;
  drawSheetPreview(previewCtx, {
    grid,
    usedSlots,
    placements: plan.placements,
    front: bitmap,
    back: null,
    frontTransform: { rotate: 0, mirror: false },
    backTransform: { rotate: 0, mirror: false },
    fitMode: "cover",
    cropMarks: true,
    pxPerMm: 4,
  });
  const preview = previewCanvas.toDataURL("image/png").split(",")[1] ?? "";

  return {
    results,
    pdf: base64,
    preview,
    placements: plan.placements.map((placement) => ({
      xMm: placement.xMm,
      yMm: placement.yMm,
      wMm: placement.widthMm,
      hMm: placement.heightMm,
    })),
  };
}
