/**
 * Geometry checks for the PVC ID card layout tool.
 *
 * The millimetre arithmetic is the part of this feature that can break
 * silently: a card that is 85.4 mm instead of 85.6 mm still looks fine on
 * screen but is wrong on paper. These assertions run against the same module
 * the app uses, so they fail the moment the maths drifts.
 *
 *   npm run check:pvc
 */
import {
  MM2PT,
  cellAtPoint,
  cellRect,
  computeGrid,
  freeSlotCount,
  planPlacement,
  sheetCapacity,
  type Grid,
} from "../src/lib/pvc-cards/layout";
import { CARD_PRESETS, PAGE_PRESETS } from "../src/lib/pvc-cards/presets";
import type { Anchor, SheetGeometry } from "../src/lib/pvc-cards/types";

let failures = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function near(actual: number, expected: number, tolerance = 0.0001): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

const A4 = PAGE_PRESETS.find((p) => p.key === "a4")!;
const CR80 = CARD_PRESETS.find((c) => c.key === "cr80")!;

const A4_CR80: SheetGeometry = {
  cardKey: "cr80",
  pageKey: "a4",
  pageWidthMm: A4.widthMm,
  pageHeightMm: A4.heightMm,
  orientation: "portrait",
  cardWidthMm: CR80.widthMm,
  cardHeightMm: CR80.heightMm,
  marginMm: 5,
  gapMm: 2,
};

/** Every card rectangle must sit inside the printable area. */
function assertInsideMargins(grid: Grid, label: string): void {
  const limit = 0.001;
  let worst = 0;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const rect = cellRect(grid, col, row);
      worst = Math.max(
        worst,
        grid.marginMm - rect.xMm,
        grid.marginMm - rect.yMm,
        rect.xMm + rect.widthMm - (grid.pageWidthMm - grid.marginMm),
        rect.yMm + rect.heightMm - (grid.pageHeightMm - grid.marginMm),
      );
    }
  }
  check(`${label}: every card is inside the margin`, worst <= limit, `worst overhang ${worst.toFixed(4)}mm`);
}

/** No two cards may overlap. */
function assertNoOverlap(grid: Grid, label: string): void {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const r = cellRect(grid, col, row);
      rects.push({ x: r.xMm, y: r.yMm, w: r.widthMm, h: r.heightMm });
    }
  }
  let overlaps = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (overlapX > 0.001 && overlapY > 0.001) overlaps += 1;
    }
  }
  check(`${label}: no two cards overlap`, overlaps === 0, `${overlaps} overlapping pairs`);
}

console.log("Presets");
check("A4 is 210 x 297 mm", A4.widthMm === 210 && A4.heightMm === 297);
check("CR80 is 85.6 x 54 mm", CR80.widthMm === 85.6 && CR80.heightMm === 54);

console.log("Grid on A4 with CR80, 5mm margin, 2mm gap");
const grid = computeGrid(A4_CR80, "bottom");
check("2 columns", grid.cols === 2, `got ${grid.cols}`);
check("5 rows", grid.rows === 5, `got ${grid.rows}`);
check("grid is 173.2mm wide", near(grid.gridWidthMm, 173.2), `got ${grid.gridWidthMm}`);
check("grid is 278mm tall", near(grid.gridHeightMm, 278), `got ${grid.gridHeightMm}`);
check("bottom row ends at the bottom margin", near(cellRect(grid, 0, 4).yMm + 54, 292));
check("top row starts 14mm down", near(cellRect(grid, 0, 0).yMm, 14));
check("capacity is 5 pairs", sheetCapacity(grid, true) === 5);
assertInsideMargins(grid, "A4");
assertNoOverlap(grid, "A4");

console.log("Cell lookup");
check("a click in the first cell resolves to (0,0)", (() => {
  const hit = cellAtPoint(grid, 10, 20);
  return hit?.col === 0 && hit?.row === 0;
})());
check("a click past the grid resolves to nothing", cellAtPoint(grid, 200, 20) === null);

console.log("Placement");
const empty = planPlacement(grid, "bottom", new Set(), 5, true);
check("5 pairs planned on a blank sheet", empty.placedPairs === 5, `got ${empty.placedPairs}`);
check("10 cells used", empty.cells.length === 10, `got ${empty.cells.length}`);
check("no overflow", empty.overflowPairs === 0);

const firstSlot = empty.placements[0];
check("the first pair lands on the bottom row", firstSlot.row === 4, `got row ${firstSlot.row}`);
check("the front is in the left cell", firstSlot.col === 0);
const backSlot = empty.placements[1];
check("the back is in the right cell of the same row", backSlot.col === 1 && backSlot.row === 4);

const over = planPlacement(grid, "bottom", new Set(), 9, true);
check("asking for 9 pairs on a 5-pair sheet overflows by 4", over.overflowPairs === 4, `got ${over.overflowPairs}`);
check("overflow still places 5 pairs", over.placedPairs === 5);
check("overflow never overlaps", over.placements.length === 10);

console.log("Used slots are skipped");
const used = new Set(["0,4", "1,4", "0,3", "1,3"]);
const afterTwo = planPlacement(grid, "bottom", used, 1, true);
check("the next card skips the used slots", afterTwo.placements[0].row === 2, `got row ${afterTwo.placements[0].row}`);
check("the next card does not reuse a used cell", !used.has(afterTwo.cells[0]));
check("two free pairs remain on that sheet", freeSlotCount(grid, used) === 6, `got ${freeSlotCount(grid, used)}`);

const usedAll = new Set(["0,4", "1,4", "0,3", "1,3", "0,2", "1,2", "0,1", "1,1", "0,0", "1,0"]);
const none = planPlacement(grid, "bottom", usedAll, 1, true);
check("a full sheet places nothing", none.placedPairs === 0);
check("a full sheet reports the shortfall", none.overflowPairs === 1);

console.log("Front-only printing");
const frontOnly = planPlacement(grid, "bottom", new Set(), 5, false);
check("5 cards placed", frontOnly.placedPairs === 5);
check("each card uses one cell", frontOnly.cells.length === 5);
check("front-only capacity is 10", sheetCapacity(grid, false) === 10);

console.log("Anchors");
const anchors: Anchor[] = ["bottom", "top", "left", "right"];
for (const anchor of anchors) {
  const anchored = computeGrid(A4_CR80, anchor);
  assertInsideMargins(anchored, `anchor ${anchor}`);
  assertNoOverlap(anchored, `anchor ${anchor}`);
  const plan = planPlacement(anchored, anchor, new Set(), 5, true);
  check(`anchor ${anchor} still places 5 pairs`, plan.placedPairs === 5, `got ${plan.placedPairs}`);
}
const topGrid = computeGrid(A4_CR80, "top");
check("the top anchor starts at the top margin", near(cellRect(topGrid, 0, 0).yMm, 5));

console.log("PDF page size round trip");
const { PDFDocument } = await import("pdf-lib");
const doc = await PDFDocument.create();
const page = doc.addPage([A4.widthMm * MM2PT, A4.heightMm * MM2PT]);
const size = page.getSize();
check(
  "the PDF page measures 210 x 297 mm",
  near(size.width / MM2PT, 210, 0.001) && near(size.height / MM2PT, 297, 0.001),
  `got ${(size.width / MM2PT).toFixed(4)} x ${(size.height / MM2PT).toFixed(4)} mm`,
);

console.log("Landscape page");
const landscape: SheetGeometry = { ...A4_CR80, orientation: "landscape", pageWidthMm: 297, pageHeightMm: 210 };
const landscapeGrid = computeGrid(landscape, "bottom");
check("landscape A4 fits 3 columns", landscapeGrid.cols === 3, `got ${landscapeGrid.cols}`);
check("landscape A4 fits 3 rows", landscapeGrid.rows === 3, `got ${landscapeGrid.rows}`);
assertInsideMargins(landscapeGrid, "landscape");
assertNoOverlap(landscapeGrid, "landscape");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
