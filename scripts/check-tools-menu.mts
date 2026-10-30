/**
 * Screenshots the dashboard header's Tools dropdown, closed and open, so it
 * can be checked without a signed-in dashboard session.
 *
 *   npx tsx scripts/check-tools-menu.mts
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import puppeteer from "puppeteer-core";

const ROOT = resolve(import.meta.dirname, "..");
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
const OUT = join(tmpdir(), "pvc-tools-menu");

const workDir = mkdtempSync(join(tmpdir(), "pvc-tools-"));
const bundlePath = join(workDir, "harness.js");
const htmlPath = join(workDir, "index.html");

// Compile the app's real stylesheet so the screenshot shows what the header
// actually looks like, rather than unstyled markup.
const postcss = (await import("postcss")).default;
const tailwindcss = (await import("@tailwindcss/postcss")).default;
const globalsPath = join(ROOT, "src/app/globals.css");
const css = await postcss([tailwindcss()]).process(readFileSync(globalsPath, "utf8"), {
  from: globalsPath,
});

await build({
  entryPoints: [join(ROOT, "scripts/pvc-tools-harness.tsx")],
  bundle: true,
  format: "iife",
  globalName: "PvcTools",
  outfile: bundlePath,
  platform: "browser",
  alias: { "@": join(ROOT, "src") },
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"development"' },
  // React's browser build still checks for a global `process`.
  banner: { js: "var process = { env: { NODE_ENV: 'development' } };" },
  logLevel: "error",
});

writeFileSync(
  htmlPath,
  `<!doctype html>
<html><head><meta charset="utf-8"><title>tools menu</title>
<style>${css.css}</style>
<style>body{background:#f4f4f5;margin:0;padding:24px}</style>
</head>
<body>
<div id="root"></div>
<script src="harness.js"></script>
<script>
  PvcTools.mountToolsMenu(document.getElementById("root"), "en");
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
  await page.setViewport({ width: 420, height: 260, deviceScaleFactor: 2 });
  page.on("pageerror", (error: unknown) => console.error(`  page error: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`  console error: ${message.text()}`);
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForSelector("button[aria-haspopup='true']");

  const button = await page.$("button[aria-haspopup='true']");
  const label = await page.evaluate((element: Element | null) => element?.textContent, button);
  console.log(`  the button reads "${label?.trim()}"`);

  await page.screenshot({ path: join(OUT, "closed.png") as `${string}.png` });

  await button?.click();
  await page.waitForSelector("a[href='/uidai-enr-form-printer/index.html']");

  const items = await page.$$eval("div.absolute a", (links) =>
    links.map((link) => ({
      text: link.textContent?.trim(),
      href: link.getAttribute("href"),
      target: link.getAttribute("target"),
    })),
  );
  for (const item of items) {
    console.log(`  menu item: "${item.text}" -> ${item.href}${item.target ? ` (${item.target})` : ""}`);
  }

  const expected = [
    { text: "UIDAI form printer", href: "/uidai-enr-form-printer/index.html", target: "_blank" },
    { text: "PVC card printer", href: "/dashboard/pvc-cards", target: null },
  ];
  let ok = true;
  for (const want of expected) {
    const got = items.find((item) => item.href === want.href);
    if (!got || got.text !== want.text || got.target !== want.target) {
      console.error(`  FAIL expected "${want.text}" -> ${want.href}`);
      ok = false;
    } else {
      console.log(`  ok   "${want.text}" -> ${want.href}`);
    }
  }

  await page.screenshot({ path: join(OUT, "open.png") as `${string}.png` });

  // Clicking away should close it again.
  await page.mouse.click(5, 5);
  await page.waitForFunction(
    "document.querySelectorAll('div.absolute a').length === 0",
    { timeout: 5000 },
  );
  console.log("  ok   clicking outside closes the menu");

  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
}

console.log(`\nscreenshots written to ${OUT}`);
