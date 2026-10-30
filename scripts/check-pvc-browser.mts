/**
 * Runs the PVC card printer's browser checks in headless Chrome and asserts
 * on the results.
 *
 *   npm run check:pvc:browser
 *
 * The image pipeline needs a real canvas, so this cannot run under plain
 * Node; it bundles the harness with esbuild and drives Chrome.
 */
import { mkdtempSync, writeFileSync } from "node:fs";

import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import puppeteer from "puppeteer-core";

const ROOT = resolve(import.meta.dirname, "..");
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

const workDir = mkdtempSync(join(tmpdir(), "pvc-browser-"));
const harnessPath = join(workDir, "harness.js");
const htmlPath = join(workDir, "index.html");

await build({
  entryPoints: [join(ROOT, "scripts/pvc-browser-harness.ts")],
  bundle: true,
  format: "iife",
  globalName: "PvcHarness",
  outfile: harnessPath,
  platform: "browser",
  alias: { "@": join(ROOT, "src") },
  logLevel: "error",
});

writeFileSync(
  htmlPath,
  `<!doctype html>
<html><head><meta charset="utf-8"><title>pvc check</title></head>
<body><div id="result"></div>
<script src="harness.js"></script>
<script>
  window.__pvcDone = false;
  PvcHarness.runBrowserChecks().then(function (payload) {
    window.__pvcPayload = payload;
    window.__pvcDone = true;
  }).catch(function (error) {
    window.__pvcPayload = { error: String((error && error.stack) || error) };
    window.__pvcDone = true;
  });
</script>
</body></html>`,
);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (error: unknown) => console.error(`  page error: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`  console error: ${message.text()}`);
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForFunction("window.__pvcDone === true", { timeout: 60_000 });

  const payload = (await page.evaluate("window.__pvcPayload")) as {
    error?: string;
    results?: { name: string; ok: boolean; detail?: string }[];
    pdf?: string;
    preview: string;
    placements: { xMm: number; yMm: number; wMm: number; hMm: number }[];
  };

  if (payload.error) {
    console.error(`The browser harness threw: ${payload.error}`);
    process.exit(1);
  }

  console.log("Browser checks");
  for (const result of payload.results ?? []) {
    check(result.name, result.ok, result.detail);
  }

  console.log("PDF checks");
  const pdfBytes = Buffer.from(payload.pdf ?? "", "base64");
  check("the PDF was produced", pdfBytes.length > 0, `${pdfBytes.length} bytes`);

  const { PDFDocument, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream } = await import("pdf-lib");
  const doc = await PDFDocument.load(pdfBytes);
  const page0 = doc.getPage(0);
  const size = page0.getSize();
  const MM2PT = 72 / 25.4;

  check(
    "the page measures 210 x 297 mm",
    Math.abs(size.width / MM2PT - 210) < 0.001 && Math.abs(size.height / MM2PT - 297) < 0.001,
    `got ${(size.width / MM2PT).toFixed(4)} x ${(size.height / MM2PT).toFixed(4)} mm`,
  );

  const images: { width: number; height: number }[] = [];
  let content = "";
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const subtype = object.dict.get(PDFName.of("Subtype"));
    if (subtype instanceof PDFName && subtype.asString().endsWith("Image")) {
      const width = object.dict.get(PDFName.of("Width"));
      const height = object.dict.get(PDFName.of("Height"));
      images.push({
        width: width instanceof PDFNumber ? width.asNumber() : -1,
        height: height instanceof PDFNumber ? height.asNumber() : -1,
      });
      continue;
    }
    const decoded = decodePDFRawStream(object).decode();
    const text = Buffer.from(decoded).toString("latin1");
    if (text.includes(" Do")) content += text;
  }

  check("exactly one image is embedded", images.length === 1, `found ${images.length}`);
  check(
    "the embedded image is 1011 x 638 px (300 dpi at CR80)",
    images[0]?.width === 1011 && images[0]?.height === 638,
    `got ${images[0]?.width} x ${images[0]?.height}`,
  );

  // Where each card actually landed on the page, in PDF points.
  const drawn = parseImageRects(content);
  check(
    "one image is drawn per card",
    drawn.length === payload.placements.length,
    `${drawn.length} draws for ${payload.placements.length} placements`,
  );

  let worstOffset = 0;
  let worstSize = 0;
  for (let index = 0; index < Math.min(drawn.length, payload.placements.length); index++) {
    const expected = payload.placements[index];
    const expectedX = expected.xMm * MM2PT;
    const expectedWidth = expected.wMm * MM2PT;
    const expectedHeight = expected.hMm * MM2PT;
    const expectedY = (297 - expected.yMm - expected.hMm) * MM2PT;

    worstOffset = Math.max(
      worstOffset,
      Math.abs(drawn[index].x - expectedX),
      Math.abs(drawn[index].y - expectedY),
    );
    worstSize = Math.max(
      worstSize,
      Math.abs(drawn[index].width - expectedWidth),
      Math.abs(drawn[index].height - expectedHeight),
    );
  }
  check(
    "every card lands at its planned position",
    drawn.length > 0 && worstOffset < 0.01,
    drawn.length > 0 ? `worst offset ${worstOffset.toFixed(5)} pt` : "no cards were drawn",
  );
  check(
    "every card is drawn at its planned size",
    drawn.length > 0 && worstSize < 0.01,
    drawn.length > 0 ? `worst size error ${worstSize.toFixed(5)} pt` : "no cards were drawn",
  );
  check(
    "a card measures 85.60 x 54.00 mm in the PDF",
    drawn.length > 0 &&
      Math.abs(drawn[0].width / MM2PT - 85.6) < 0.01 &&
      Math.abs(drawn[0].height / MM2PT - 54) < 0.01,
    drawn.length > 0
      ? `got ${(drawn[0].width / MM2PT).toFixed(4)} x ${(drawn[0].height / MM2PT).toFixed(4)} mm`
      : "no cards were drawn",
  );

  // Save the rendered preview so it can be looked at.
  const previewBytes = Buffer.from(payload.preview ?? "", "base64");
  check("the sheet preview rendered", previewBytes.length > 0, `${previewBytes.length} bytes`);
  writeFileSync(join(workDir, "preview.png"), previewBytes);
  console.log(`  preview written to ${join(workDir, "preview.png")}`);
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll browser checks passed.");

/**
 * Reads back where each image was actually drawn.
 *
 * Walks the content stream's transformation matrix, so this checks the PDF
 * bytes rather than the code that produced them.
 */
function parseImageRects(content: string): { x: number; y: number; width: number; height: number }[] {
  type Matrix = [number, number, number, number, number, number];

  // Row-vector convention: x' = a*x + c*y + e, y' = b*x + d*y + f.
  const multiply = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];

  // Names ("/Image-1"), numbers, and operators ("Do", "cm", "q", "Q").
  const tokens = content.match(/\/[^\s]+|[-+]?[\d.]+|[A-Za-z*'"]+/g) ?? [];
  const stack: Matrix[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const args: number[] = [];
  const rects: { x: number; y: number; width: number; height: number }[] = [];

  for (const token of tokens) {
    if (/^[-+]?[\d.]+$/.test(token)) {
      args.push(Number(token));
      continue;
    }
    switch (token) {
      case "q":
        stack.push(ctm);
        break;
      case "Q":
        ctm = stack.pop() ?? ctm;
        break;
      case "cm": {
        const m = args.splice(-6) as Matrix;
        // "cm" concatenates the given matrix with the current one.
        ctm = multiply(m, ctm);
        break;
      }
      case "Do":
        // The image occupies the unit square, transformed by the matrix.
        rects.push({
          x: ctm[4],
          y: ctm[5],
          width: Math.hypot(ctm[0], ctm[1]),
          height: Math.hypot(ctm[2], ctm[3]),
        });
        break;
      default:
        args.length = 0;
        break;
    }
  }

  return rects;
}
