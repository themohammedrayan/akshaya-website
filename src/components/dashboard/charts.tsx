// Small server-rendered SVG charts (no chart library). Hover shows a native tooltip
// per column; callers render a table view alongside, since some series colours are
// under 3:1 contrast on white.
import { formatINR } from "@/lib/billing";

// Categorical slots, fixed order (validated adjacent-pair CVD-safe on light surfaces).
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

const W = 640;
const PAD = { top: 12, right: 8, bottom: 26, left: 56 };
const GRID = "#e4e4e7"; // zinc-200
const AXIS_TEXT = "#71717a"; // zinc-500

function niceMax(v: number): number {
  if (v <= 0) return 0;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 4)! * pow;
  return Math.ceil(v / step) * step;
}

function shortINR(v: number): string {
  const a = Math.abs(v);
  const s = a >= 100_000 ? `${+(a / 100_000).toFixed(1)}L` : a >= 1000 ? `${+(a / 1000).toFixed(1)}k` : `${Math.round(a)}`;
  return `${v < 0 ? "−" : ""}₹${s}`;
}

/** Bar with 4px rounded data-end, square at the baseline. */
function barPath(x: number, y0: number, w: number, y1: number): string {
  const up = y1 < y0;
  const h = Math.abs(y0 - y1);
  const r = Math.min(4, w / 2, h);
  if (h === 0) return "";
  if (up) {
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  }
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function scale(values: number[], height: number) {
  const max = niceMax(Math.max(0, ...values));
  const min = -niceMax(Math.max(0, ...values.map((v) => -v)));
  const span = max - min || 1;
  const plotH = height - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ((max - v) / span) * plotH;
  const ticks = [min, min / 2, 0, max / 2, max].filter((t, i, a) => a.indexOf(t) === i && t >= min && t <= max);
  return { y, ticks };
}

function Axes({ ticks, y, labels, step }: { ticks: number[]; y: (v: number) => number; labels: { x: number; text: string }[]; step: number }) {
  return (
    <g fontSize="11" fill={AXIS_TEXT}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#a1a1aa" : GRID} strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
            {shortINR(t)}
          </text>
        </g>
      ))}
      {labels.map((l, i) =>
        i % step === 0 ? (
          <text key={i} x={l.x} y={y(ticks[0]) + 16} textAnchor="middle">
            {l.text}
          </text>
        ) : null,
      )}
    </g>
  );
}

export type BarDatum = { label: string; value: number; tip: string };

/** One series of bars, with an optional second series drawn as a 2px line (same scale). */
export function BarChart({
  data,
  line,
  height = 220,
  color = SERIES[0],
  lineColor = SERIES[1],
  ariaLabel,
}: {
  data: BarDatum[];
  line?: number[];
  height?: number;
  color?: string;
  lineColor?: string;
  ariaLabel: string;
}) {
  const { y, ticks } = scale([...data.map((d) => d.value), ...(line ?? [])], height);
  const plotW = W - PAD.left - PAD.right;
  const slot = plotW / Math.max(data.length, 1);
  const gap = Math.max(2, slot * 0.25);
  const bw = Math.max(1, slot - gap);
  const cx = (i: number) => PAD.left + i * slot + slot / 2;
  const step = Math.ceil(data.length / 12);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
      <Axes ticks={ticks} y={y} labels={data.map((d, i) => ({ x: cx(i), text: d.label }))} step={step} />
      {data.map((d, i) => (
        <path key={i} d={barPath(cx(i) - bw / 2, y(0), bw, y(d.value))} fill={color} />
      ))}
      {line && line.length > 1 && (
        <polyline
          points={line.map((v, i) => `${cx(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {line?.map((v, i) => (
        <circle key={i} cx={cx(i)} cy={y(v)} r={line.length > 31 ? 0 : 4} fill={lineColor} stroke="#fff" strokeWidth={2} />
      ))}
      {/* Full-height hit targets so hovering anywhere in a column shows its tooltip. */}
      {data.map((d, i) => (
        <rect key={i} x={cx(i) - slot / 2} y={PAD.top} width={slot} height={height - PAD.top - PAD.bottom} fill="transparent">
          <title>{d.tip}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Stacked bars (all segments >= 0), 2px white gap between segments. */
export function StackedBarChart({
  rows,
  series,
  height = 240,
  ariaLabel,
}: {
  rows: { label: string; values: number[] }[];
  series: string[];
  height?: number;
  ariaLabel: string;
}) {
  const totals = rows.map((r) => r.values.reduce((s, v) => s + Math.max(0, v), 0));
  const { y, ticks } = scale(totals, height);
  const plotW = W - PAD.left - PAD.right;
  const slot = plotW / Math.max(rows.length, 1);
  const bw = Math.max(1, slot - Math.max(2, slot * 0.25));
  const cx = (i: number) => PAD.left + i * slot + slot / 2;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
      <Axes ticks={ticks} y={y} labels={rows.map((r, i) => ({ x: cx(i), text: r.label }))} step={Math.ceil(rows.length / 12)} />
      {rows.map((r, i) => {
        let acc = 0;
        const last = r.values.reduce((li, v, k) => (v > 0 ? k : li), -1);
        return (
          <g key={i}>
            {r.values.map((v, k) => {
              if (v <= 0) return null;
              const y0 = y(acc);
              acc += v;
              const y1 = y(acc);
              const x = cx(i) - bw / 2;
              return k === last ? (
                <path key={k} d={barPath(x, y0, bw, y1)} fill={series[k]} stroke="#fff" strokeWidth={k ? 2 : 0} />
              ) : (
                <rect key={k} x={x} y={y1} width={bw} height={y0 - y1} fill={series[k]} stroke="#fff" strokeWidth={k ? 2 : 0} />
              );
            })}
            <rect x={cx(i) - slot / 2} y={PAD.top} width={slot} height={height - PAD.top - PAD.bottom} fill="transparent">
              <title>{`${r.label}: ${formatINR(totals[i])}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className={it.line ? "inline-block h-0.5 w-4 rounded" : "inline-block h-2.5 w-2.5 rounded-sm"}
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bars for ranked lists (top expenses, weekday averages). */
export function HBars({ rows, color = SERIES[0] }: { rows: { label: string; value: number; detail?: string }[]; color?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value)) || 1;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm" title={r.detail}>
          <span className="truncate text-zinc-700">{r.label}</span>
          <span className="h-3 rounded-r bg-zinc-100">
            <span
              className="block h-3 rounded-r"
              style={{ width: `${Math.max(0, (r.value / max) * 100)}%`, backgroundColor: color }}
            />
          </span>
          <span className="text-right font-medium text-zinc-900">{formatINR(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
