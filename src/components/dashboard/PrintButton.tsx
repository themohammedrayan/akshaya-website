"use client";

import { useEffect } from "react";

export function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 print:hidden"
    >
      Print
    </button>
  );
}
