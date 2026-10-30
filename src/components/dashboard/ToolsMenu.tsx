"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ChevronDownIcon, IdCardIcon, PrinterIcon, ToolsIcon } from "./icons";

/**
 * The counter's tools, in one place.
 *
 * The UIDAI form printer is a separate static app that has no login of its
 * own, so it opens in a new tab; the PVC card printer is a dashboard route.
 */
export function ToolsMenu() {
  const { t } = useTranslation();
  const tr = (key: string) => t(`billing.tools.${key}`);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        className={clsx(
          "flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
          open
            ? "bg-zinc-100 text-zinc-900"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
        )}
      >
        <ToolsIcon className="h-5 w-5" />
        {tr("label")}
        <ChevronDownIcon className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          <a
            href="/uidai-enr-form-printer/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <PrinterIcon className="h-5 w-5 shrink-0 text-zinc-400" />
            {tr("uidai")}
          </a>
          <Link
            href="/dashboard/pvc-cards"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <IdCardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
            {tr("pvc")}
          </Link>
        </div>
      )}
    </div>
  );
}
