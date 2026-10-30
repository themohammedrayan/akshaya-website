/**
 * Core types for the PVC ID card layout tool.
 *
 * Every length in this module is in millimetres. Pixels only appear where we
 * rasterise an image for the PDF, and there they are always derived from a
 * millimetre size and a DPI so the printed result is exact.
 */

/** How a photo is fitted into the card rectangle. */
export type FitMode = "cover" | "contain" | "stretch";

/**
 * Which edge the batch of cards grows from.
 *
 * The slot grid is always the same size for a given geometry; the anchor only
 * decides where that grid sits on the page and which slots get used first, so
 * the leftover paper ends up on the side the operator expects.
 */
export type Anchor = "bottom" | "top" | "left" | "right";

export type Orientation = "portrait" | "landscape";

export type CardSize = {
  /** Preset key, or "custom" for a hand-entered size. */
  key: string;
  label: string;
  widthMm: number;
  heightMm: number;
};

export type PageSize = {
  key: string;
  label: string;
  /** Portrait dimensions. Landscape swaps them. */
  widthMm: number;
  heightMm: number;
};

/**
 * Everything the slot grid is derived from. A sheet stores its own copy so a
 * sheet always describes the paper it was printed on, even after the global
 * defaults move on.
 */
export type SheetGeometry = {
  /** Preset key the size came from, or "custom". */
  cardKey: string;
  pageKey: string;
  /** Page dimensions as oriented (already swapped for landscape). */
  pageWidthMm: number;
  pageHeightMm: number;
  orientation: Orientation;
  cardWidthMm: number;
  cardHeightMm: number;
  marginMm: number;
  gapMm: number;
};

/**
 * Printer calibration. This is a property of a physical printer, not of a
 * job, so it lives outside the sheets. Applied at export time only.
 */
export type Calibration = {
  offsetXMm: number;
  offsetYMm: number;
  /** 1 = exact. Corrects a printer that scales the page down slightly. */
  scale: number;
};

/** One physical sheet of paper, with the slots that have been printed on. */
export type Sheet = {
  id: string;
  name: string;
  geometry: SheetGeometry;
  /** Cell keys, "col,row". */
  usedSlots: string[];
  createdAt: number;
};

/** Settings for the job currently being prepared. */
export type JobSettings = {
  fitMode: FitMode;
  copies: number;
  anchor: Anchor;
  dpi: 300 | 600;
  losslessPng: boolean;
  autoRotate: boolean;
  cropMarks: boolean;
};

/** A photo of one side of a card, as loaded in the browser. */
export type CardImage = {
  id: string;
  name: string;
  /** Natural pixel dimensions of the source, before any rotation. */
  width: number;
  height: number;
  /** Clockwise rotation applied when drawing, in degrees. */
  rotate: 0 | 90 | 180 | 270;
  /** Flip horizontally, for cards printed back-to-back. */
  mirror: boolean;
};
