import type { Color, PDFPage } from "pdf-lib";
import { MM2PT, type Placement } from "./layout";
import type { Calibration } from "./types";

/** An encoded card face, ready to be embedded in the PDF. */
export type EmbeddedImage = {
  bytes: Uint8Array;
  isPng: boolean;
};

export type SheetPdfInput = {
  pageWidthMm: number;
  pageHeightMm: number;
  placements: Placement[];
  front: EmbeddedImage | null;
  back: EmbeddedImage | null;
  calibration: Calibration;
  cropMarks: boolean;
};

/**
 * pdf-lib is a large dependency and this tool only needs it at the moment the
 * operator asks for a PDF, so it is imported here rather than at the top of
 * the module. That keeps it out of the page's initial bundle.
 */
async function loadPdfLib() {
  return import("pdf-lib");
}

/**
 * Builds the printable sheet.
 *
 * The page is created at the paper's exact size, and each card is drawn at
 * its exact millimetre size, so a PDF reader reports an A4 page as
 * 210 x 297 mm and a card measures 85.60 x 54.00 mm on paper.
 */
export async function buildSheetPdf(input: SheetPdfInput): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await loadPdfLib();

  const doc = await PDFDocument.create();
  const pageHeightPt = input.pageHeightMm * MM2PT;
  const page = doc.addPage([input.pageWidthMm * MM2PT, pageHeightPt]);

  const cal = input.calibration;

  /** Millimetres from the top-left of the page to PDF points, origin bottom-left. */
  const place = (xMm: number, yMm: number) => ({
    x: (xMm * cal.scale + cal.offsetXMm) * MM2PT,
    y: pageHeightPt - (yMm * cal.scale + cal.offsetYMm) * MM2PT,
  });

  const embed = async (image: EmbeddedImage) =>
    image.isPng ? doc.embedPng(image.bytes) : doc.embedJpg(image.bytes);

  // Each face is embedded once and drawn as many times as there are copies.
  const frontImage = input.front ? await embed(input.front) : null;
  const backImage = input.back ? await embed(input.back) : null;

  const markColor = rgb(0.72, 0.72, 0.72);

  for (const placement of input.placements) {
    const image = placement.side === "front" ? frontImage : backImage;
    if (!image) continue;

    const { x } = place(placement.xMm, placement.yMm);
    const width = placement.widthMm * cal.scale * MM2PT;
    const height = placement.heightMm * cal.scale * MM2PT;
    const y = place(placement.xMm, placement.yMm + placement.heightMm).y;

    page.drawImage(image, { x, y, width, height });

    if (input.cropMarks) {
      drawCropMarks(page, { x, y, width, height }, markColor);
    }
  }

  return doc.save();
}

/** Short corner ticks outside a card, so the cutter has something to line up on. */
function drawCropMarks(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  color: Color,
): void {
  const armMm = 3;
  const gapMm = 0.6;
  const arm = armMm * MM2PT;
  const gap = gapMm * MM2PT;
  const thickness = 0.25;

  const corners = [
    { x: rect.x, y: rect.y, dx: -1, dy: -1 },
    { x: rect.x + rect.width, y: rect.y, dx: 1, dy: -1 },
    { x: rect.x, y: rect.y + rect.height, dx: -1, dy: 1 },
    { x: rect.x + rect.width, y: rect.y + rect.height, dx: 1, dy: 1 },
  ];

  for (const corner of corners) {
    page.drawLine({
      start: { x: corner.x, y: corner.y },
      end: { x: corner.x + corner.dx * gap, y: corner.y + corner.dy * gap },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: corner.x + corner.dx * gap, y: corner.y },
      end: { x: corner.x + corner.dx * (gap + arm), y: corner.y },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: corner.x, y: corner.y + corner.dy * gap },
      end: { x: corner.x, y: corner.y + corner.dy * (gap + arm) },
      thickness,
      color,
    });
  }
}

/**
 * A calibration sheet: a 10 mm grid, a crosshair and a 150 mm bar, so the
 * operator can measure the printer's drift with a ruler and correct it.
 */
export async function buildTestGridPdf(
  pageWidthMm: number,
  pageHeightMm: number,
  cardWidthMm: number,
  cardHeightMm: number,
  calibration: Calibration,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();

  const doc = await PDFDocument.create();
  const pageHeightPt = pageHeightMm * MM2PT;
  const page = doc.addPage([pageWidthMm * MM2PT, pageHeightPt]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const cal = calibration;
  const place = (xMm: number, yMm: number) => ({
    x: (xMm * cal.scale + cal.offsetXMm) * MM2PT,
    y: pageHeightPt - (yMm * cal.scale + cal.offsetYMm) * MM2PT,
  });

  const gridColor = rgb(0.85, 0.85, 0.85);
  const black = rgb(0, 0, 0);

  for (let x = 0; x <= pageWidthMm; x += 10) {
    const a = place(x, 0);
    const b = place(x, pageHeightMm);
    page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: 0.2, color: gridColor });
  }
  for (let y = 0; y <= pageHeightMm; y += 10) {
    const a = place(0, y);
    const b = place(pageWidthMm, y);
    page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: 0.2, color: gridColor });
  }

  // Crosshair 20 mm from the top and left edges.
  const armMm = 8;
  const c1 = place(20 - armMm, 20);
  const c2 = place(20 + armMm, 20);
  const c3 = place(20, 20 - armMm);
  const c4 = place(20, 20 + armMm);
  page.drawLine({ start: c1, end: c2, thickness: 0.5, color: black });
  page.drawLine({ start: c3, end: c4, thickness: 0.5, color: black });

  const crossLabel = place(22, 32);
  page.drawText("Crosshair centre: 20.00mm from top, 20.00mm from left.", {
    x: crossLabel.x,
    y: crossLabel.y,
    size: 7,
    font,
    color: black,
  });

  // A card-sized outline to measure against.
  const cardTop = place(30, 45);
  page.drawRectangle({
    x: cardTop.x,
    y: cardTop.y,
    width: cardWidthMm * cal.scale * MM2PT,
    height: cardHeightMm * cal.scale * MM2PT,
    borderColor: black,
    borderWidth: 0.4,
  });
  const cardLabel = place(30, 40);
  page.drawText(
    `Card outline: should measure ${cardWidthMm.toFixed(2)} x ${cardHeightMm.toFixed(2)} mm.`,
    { x: cardLabel.x, y: cardLabel.y, size: 7, font, color: black },
  );

  // A 150 mm bar with ticks every 10 mm, taller every 50 mm.
  const barY = pageHeightMm - 30;
  const barStart = place(20, barY);
  const barEnd = place(170, barY);
  page.drawLine({ start: barStart, end: barEnd, thickness: 0.5, color: black });
  for (let mm = 0; mm <= 150; mm += 10) {
    const half = mm % 50 === 0 ? 3 : 1.5;
    const t1 = place(20 + mm, barY - half);
    const t2 = place(20 + mm, barY + half);
    page.drawLine({ start: t1, end: t2, thickness: 0.5, color: black });
  }
  const barLabel = place(20, barY + 8);
  page.drawText("Bar: should measure exactly 150.00mm end to end.", {
    x: barLabel.x,
    y: barLabel.y,
    size: 7,
    font,
    color: black,
  });

  return doc.save();
}
