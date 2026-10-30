import type { CardSize, PageSize, SheetGeometry } from "./types";

/**
 * Card sizes in millimetres.
 *
 * CR80 is the PVC card blank sold for Aadhaar/voter/PAN cards and is the
 * default. ISO/IEC 7810 ID-1 is 85.60 x 53.98 mm; the market rounds it to
 * 54 mm, which is what the cutter is sized for.
 */
export const CARD_PRESETS: CardSize[] = [
  { key: "cr80", label: "CR80 (ID-1)", widthMm: 85.6, heightMm: 54 },
  { key: "a7", label: "A7", widthMm: 74, heightMm: 105 },
  { key: "a6", label: "A6", widthMm: 105, heightMm: 148 },
  { key: "custom", label: "Custom", widthMm: 85.6, heightMm: 54 },
];

/**
 * Page sizes in millimetres, given in portrait orientation. Landscape swaps
 * the two numbers.
 */
export const PAGE_PRESETS: PageSize[] = [
  { key: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  { key: "a3", label: "A3", widthMm: 297, heightMm: 420 },
  { key: "a5", label: "A5", widthMm: 148, heightMm: 210 },
  { key: "letter", label: "Letter", widthMm: 215.9, heightMm: 279.4 },
  { key: "legal", label: "Legal", widthMm: 215.9, heightMm: 355.6 },
  { key: "custom", label: "Custom", widthMm: 210, heightMm: 297 },
];

export const DEFAULT_CARD_KEY = "cr80";
export const DEFAULT_PAGE_KEY = "a4";
export const DEFAULT_MARGIN_MM = 5;
export const DEFAULT_GAP_MM = 2;

export function findCardPreset(key: string): CardSize {
  return CARD_PRESETS.find((c) => c.key === key) ?? CARD_PRESETS[0];
}

export function findPagePreset(key: string): PageSize {
  return PAGE_PRESETS.find((p) => p.key === key) ?? PAGE_PRESETS[0];
}

/** The geometry a fresh sheet starts with: CR80 on A4 portrait. */
export function defaultGeometry(): SheetGeometry {
  const card = findCardPreset(DEFAULT_CARD_KEY);
  const page = findPagePreset(DEFAULT_PAGE_KEY);
  return {
    cardKey: card.key,
    pageKey: page.key,
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    orientation: "portrait",
    cardWidthMm: card.widthMm,
    cardHeightMm: card.heightMm,
    marginMm: DEFAULT_MARGIN_MM,
    gapMm: DEFAULT_GAP_MM,
  };
}
