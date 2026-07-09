'use client';

import { useRef, useState } from 'react';

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  value: number; // 0–100
}

/**
 * A quiet single-series line + area over a fixed 0–100 domain, with a
 * crosshair tooltip on hover/touch. Identity comes from the surrounding
 * label, so there's no legend; text stays in ink tokens, never series color.
 */
export default function LineChart({
  points,
  color,
  height = 96,
  label,
}: {
  points: ChartPoint[];
  color: string;
  height?: number;
  label: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-surface text-sm text-ink-faint"
        style={{ height }}
      >
        Not enough days yet. It fills in as you go.
      </div>
    );
  }

  const W = 320;
  const H = 100;
  const padY = 4;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => padY + (1 - v / 100) * (H - padY * 2);
  const line = points.map((p, i) => `${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' L ');
  const area = `M 0,${H} L ${line} L ${W},${H} Z`;

  function locate(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHover(Math.round(frac * (points.length - 1)));
  }

  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full touch-none rounded-xl"
        style={{ height }}
        role="img"
        aria-label={label}
        onPointerMove={locate}
        onPointerDown={locate}
        onPointerLeave={() => setHover(null)}
      >
        {/* recessive quarter gridlines */}
        {[25, 50, 75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={y(g)}
            y2={y(g)}
            stroke="var(--color-line)"
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}
        <path d={area} fill={color} opacity="0.12" />
        <path
          d={`M ${line}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {h && (
          <>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={0}
              y2={H}
              stroke="var(--color-ink-dim)"
              strokeWidth="0.75"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={x(hover!)} cy={y(h.value)} r="3.5" fill={color} stroke="var(--color-bg)" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-raised px-2.5 py-1 text-xs text-ink"
          style={{ left: `${(hover! / (points.length - 1)) * 100}%` }}
        >
          {formatDate(h.date)} · {Math.round(h.value)}
        </div>
      )}
    </div>
  );
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
