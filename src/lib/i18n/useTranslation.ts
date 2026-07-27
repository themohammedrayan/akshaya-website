"use client";

import { useContext } from "react";
import { LanguageContext } from "./LanguageProvider";

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
