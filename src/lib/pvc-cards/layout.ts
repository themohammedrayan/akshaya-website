import type { Anchor, SheetGeometry } from "./types";

/** PDF points per millimetre. Same constant the UIDAI overlay printer uses. */
export const MM2PT = 72 / 25.4;

/**
 * The slot grid a sheet is divided into.
 *
 * Row 0 is the top row of the grid as drawn on the page; columns run left to
 * right. The anchor decides where the grid sits, so with the default
 * "bottom" anchor the grid's last row is the one nearest the bottom of the
 * page.
 */
export type Grid = {
  cols: number;
  rows: number;
  cardWidthMm: number;
  cardHeightMm: number;
  gapMm: number;
  /** Pitch between the left edges of two neighbouring cells. */
  cellWidthMm: number;
  /** Pitch between the top edges of two neighbouring rows. */
  cellHeightMm: number;
  gridWidthMm: number;
  gridHeightMm: number;
  /** Left edge of column 0, measured from the left of the page. */
  originXMm: number;
  /** Top edge of row 0, measured from the top of the page. */
  originYMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
};

export type CellRect = {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

/** Stable key for a cell within a sheet. */
export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Divides the printable area of a page into card-sized slots.
 *
 * The gap sits *between* cards, never before the first or after the last, so
 * a grid of n columns is `n * cardWidth + (n - 1) * gap` wide.
 */
export function computeGrid(geometry: SheetGeometry, anchor: Anchor): Grid {
  const usableWidthMm = geometry.pageWidthMm - 2 * geometry.marginMm;
  const usableHeightMm = geometry.pageHeightMm - 2 * geometry.marginMm;

  const cellWidthMm = geometry.cardWidthMm + geometry.gapMm;
  const cellHeightMm = geometry.cardHeightMm + geometry.gapMm;

  const cols = usableWidthMm > 0 ? Math.floor((usableWidthMm + geometry.gapMm) / cellWidthMm) : 0;
  const rows = usableHeightMm > 0 ? Math.floor((usableHeightMm + geometry.gapMm) / cellHeightMm) : 0;

  const gridWidthMm = cols > 0 ? cols * geometry.cardWidthMm + (cols - 1) * geometry.gapMm : 0;
  const gridHeightMm = rows > 0 ? rows * geometry.cardHeightMm + (rows - 1) * geometry.gapMm : 0;

  let originXMm = geometry.marginMm;
  let originYMm = geometry.marginMm;

  if (anchor === "bottom") {
    // Pin the grid to the bottom edge so the leftover paper collects at the top.
    originYMm = geometry.pageHeightMm - geometry.marginMm - gridHeightMm;
  } else if (anchor === "right") {
    originXMm = geometry.pageWidthMm - geometry.marginMm - gridWidthMm;
  }

  return {
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
    cardWidthMm: geometry.cardWidthMm,
    cardHeightMm: geometry.cardHeightMm,
    gapMm: geometry.gapMm,
    cellWidthMm,
    cellHeightMm,
    gridWidthMm,
    gridHeightMm,
    originXMm,
    originYMm,
    pageWidthMm: geometry.pageWidthMm,
    pageHeightMm: geometry.pageHeightMm,
    marginMm: geometry.marginMm,
  };
}

/** The rectangle a single card occupies on the page. */
export function cellRect(grid: Grid, col: number, row: number): CellRect {
  return {
    xMm: grid.originXMm + col * grid.cellWidthMm,
    yMm: grid.originYMm + row * grid.cellHeightMm,
    widthMm: grid.cardWidthMm,
    heightMm: grid.cardHeightMm,
  };
}

/** The cell at a point on the page, or null when the point is outside the grid. */
export function cellAtPoint(grid: Grid, xMm: number, yMm: number): { col: number; row: number } | null {
  const col = Math.round((xMm - grid.originXMm) / grid.cellWidthMm);
  const row = Math.round((yMm - grid.originYMm) / grid.cellHeightMm);
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return null;

  // Round can land on the gap between two cells; treat the gap as belonging
  // to the nearer cell so a click in the gutter still selects something.
  const rect = cellRect(grid, col, row);
  const gapHalf = grid.gapMm / 2;
  const inX = xMm >= rect.xMm - gapHalf && xMm <= rect.xMm + rect.widthMm + gapHalf;
  const inY = yMm >= rect.yMm - gapHalf && yMm <= rect.yMm + rect.heightMm + gapHalf;
  return inX && inY ? { col, row } : null;
}

export type Placement = {
  side: "front" | "back";
  /** Which copy of the card this placement belongs to. */
  pairIndex: number;
  col: number;
  row: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type Plan = {
  placements: Placement[];
  /** Cell keys this job occupies, so the UI can highlight them. */
  cells: string[];
  requestedPairs: number;
  placedPairs: number;
  /** Pairs that did not fit; the caller must warn rather than overlap them. */
  overflowPairs: number;
};

/**
 * The order slots are considered for the next card.
 *
 * "bottom" and "top" scan row by row; "left" and "right" scan column by
 * column, so with a wider page they fill the leftmost (or rightmost) pair of
 * columns completely before moving sideways.
 */
function scanOrder(grid: Grid, anchor: Anchor): { col: number; row: number }[] {
  const cols = Array.from({ length: grid.cols }, (_, i) => i);
  const rows = Array.from({ length: grid.rows }, (_, i) => i);

  const order: { col: number; row: number }[] = [];

  if (anchor === "bottom" || anchor === "top") {
    const rowOrder = anchor === "bottom" ? rows.slice().reverse() : rows;
    for (const row of rowOrder) for (const col of cols) order.push({ col, row });
    return order;
  }

  const colOrder = anchor === "right" ? cols.slice().reverse() : cols;
  for (const col of colOrder) for (const row of rows) order.push({ col, row });
  return order;
}

/**
 * How many cards a completely blank sheet of this geometry can hold.
 *
 * With a back image every card needs two adjacent slots, so only columns
 * 0..cols-2 can start a card.
 */
export function sheetCapacity(grid: Grid, hasBack: boolean): number {
  const usableCols = hasBack ? Math.max(0, grid.cols - 1) : grid.cols;
  return usableCols * grid.rows;
}

/**
 * Works out where the next cards go.
 *
 * Used slots are always skipped, whatever the anchor: that is what lets the
 * operator print a few cards, cut them out, and come back to the same sheet
 * later. Slots are never shared and cards never overlap - if there is not
 * enough room the shortfall is reported instead.
 */
export function planPlacement(
  grid: Grid,
  anchor: Anchor,
  usedSlots: ReadonlySet<string>,
  pairs: number,
  hasBack: boolean,
): Plan {
  const occupied = new Set(usedSlots);
  const placements: Placement[] = [];
  const cells: string[] = [];
  let placedPairs = 0;

  for (const { col, row } of scanOrder(grid, anchor)) {
    if (placedPairs >= pairs) break;

    const unitCols = hasBack ? [col, col + 1] : [col];
    if (unitCols.some((c) => c < 0 || c >= grid.cols)) continue;
    if (unitCols.some((c) => occupied.has(cellKey(c, row)))) continue;

    for (const c of unitCols) occupied.add(cellKey(c, row));

    const frontRect = cellRect(grid, unitCols[0], row);
    placements.push({
      side: "front",
      pairIndex: placedPairs,
      col: unitCols[0],
      row,
      xMm: frontRect.xMm,
      yMm: frontRect.yMm,
      widthMm: frontRect.widthMm,
      heightMm: frontRect.heightMm,
    });
    cells.push(cellKey(unitCols[0], row));

    if (hasBack) {
      const backRect = cellRect(grid, unitCols[1], row);
      placements.push({
        side: "back",
        pairIndex: placedPairs,
        col: unitCols[1],
        row,
        xMm: backRect.xMm,
        yMm: backRect.yMm,
        widthMm: backRect.widthMm,
        heightMm: backRect.heightMm,
      });
      cells.push(cellKey(unitCols[1], row));
    }

    placedPairs += 1;
  }

  return {
    placements,
    cells,
    requestedPairs: pairs,
    placedPairs,
    overflowPairs: Math.max(0, pairs - placedPairs),
  };
}

/** How many free slots a sheet has left. */
export function freeSlotCount(grid: Grid, usedSlots: ReadonlySet<string>): number {
  let free = 0;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!usedSlots.has(cellKey(col, row))) free += 1;
    }
  }
  return free;
}
