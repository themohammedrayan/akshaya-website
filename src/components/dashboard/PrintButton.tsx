"use client";

import { useEffect } from "react";

/** Resolves once every <img> on the page has loaded (or failed), max 2.5s. */
function imagesReady(): Promise<void> {
  const pending = Array.from(document.images).filter((img) => !img.complete);
  const loads = pending.map(
    (img) =>
      new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      }),
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  return Promise.race([Promise.all(loads).then(() => undefined), timeout]);
}

export function PrintButton({ autoPrint = false, label = "Print" }: { autoPrint?: boolean; label?: string }) {
  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    imagesReady().then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
    };
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => imagesReady().then(() => window.print())}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-base font-semibold text-zinc-800 hover:bg-zinc-50 print:hidden"
    >
      🖨 {label}
    </button>
  );
}
