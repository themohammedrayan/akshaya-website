import { defaultGeometry } from "./presets";
import type { Calibration, JobSettings, Sheet, SheetGeometry } from "./types";

/**
 * Persistence for the card printer.
 *
 * Everything lives in this browser's localStorage: the sheets the operator has
 * printed on, which slots of each sheet are used, and the calibration for the
 * printer sitting next to them. None of it is sensitive - the card photos
 * themselves are never stored, only the fact that a slot was printed on.
 *
 * The store is exposed through useSyncExternalStore rather than a
 * useEffect + setState pair, which is the supported way to read an external
 * store in React: it renders the same markup on the server and the client,
 * and re-renders when the store changes.
 */

const SETTINGS_KEY = "pvc_cards_settings_v1";
const SHEETS_KEY = "pvc_cards_sheets_v1";
const ACTIVE_SHEET_KEY = "pvc_cards_active_sheet_v1";

export const DEFAULT_JOB_SETTINGS: JobSettings = {
  fitMode: "cover",
  copies: 1,
  anchor: "bottom",
  dpi: 300,
  losslessPng: false,
  autoRotate: true,
  cropMarks: false,
};

export const DEFAULT_CALIBRATION: Calibration = {
  offsetXMm: 0,
  offsetYMm: 0,
  scale: 1,
};

export type StoredState = {
  job: JobSettings;
  calibration: Calibration;
  sheets: Sheet[];
  activeSheetId: string;
};

/**
 * What the server renders with. A module constant, so its identity is stable
 * between renders - React compares snapshots by reference.
 */
const SERVER_STATE: StoredState = {
  job: DEFAULT_JOB_SETTINGS,
  calibration: DEFAULT_CALIBRATION,
  sheets: [],
  activeSheetId: "",
};

let cache: StoredState | null = null;
const listeners = new Set<() => void>();

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Private browsing, a full quota, or hand-edited junk. Either way the tool
    // should still work, just without remembering.
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing we can do about it; the session still works in memory.
  }
}

function readState(): StoredState {
  if (cache) return cache;

  const stored = readJson<Partial<StoredState>>(SETTINGS_KEY, {});
  const job = { ...DEFAULT_JOB_SETTINGS, ...(stored.job ?? {}) };
  const calibration = { ...DEFAULT_CALIBRATION, ...(stored.calibration ?? {}) };

  const storedSheets = readJson<Sheet[]>(SHEETS_KEY, []);
  const sheets =
    Array.isArray(storedSheets) && storedSheets.length > 0
      ? storedSheets.filter((sheet) => sheet && typeof sheet.id === "string" && sheet.geometry)
      : [createSheet(nextSheetName([]), defaultGeometry())];

  const activeSheetId = readJson<string | null>(ACTIVE_SHEET_KEY, null) ?? sheets[0].id;

  cache = { job, calibration, sheets, activeSheetId };
  return cache;
}

/** Notifies React that the stored state changed. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): StoredState {
  return readState();
}

/** Used while rendering on the server and during hydration. */
export function getServerSnapshot(): StoredState {
  return SERVER_STATE;
}

/** Writes the given parts of the state and re-renders every subscriber. */
export function updateState(patch: Partial<StoredState>): void {
  const current = readState();
  const next = { ...current, ...patch };

  writeJson(SETTINGS_KEY, { job: next.job, calibration: next.calibration });
  writeJson(SHEETS_KEY, next.sheets);
  writeJson(ACTIVE_SHEET_KEY, next.activeSheetId);

  cache = next;
  for (const listener of listeners) listener();
}

// Another tab changed the same sheet, so pick the change up.
if (typeof window !== "undefined") {
  window.addEventListener("storage", () => {
    cache = null;
    for (const listener of listeners) listener();
  });
}

export function createSheet(name: string, geometry: SheetGeometry): Sheet {
  return {
    id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    geometry,
    usedSlots: [],
    createdAt: Date.now(),
  };
}

/** "Sheet 1", "Sheet 2", ... for the next unused name. */
export function nextSheetName(sheets: Sheet[]): string {
  const used = new Set(sheets.map((sheet) => sheet.name));
  let index = sheets.length + 1;
  while (used.has(`Sheet ${index}`)) index += 1;
  return `Sheet ${index}`;
}
