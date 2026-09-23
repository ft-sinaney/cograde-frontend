"use client";

import type { HighlightSpan } from "@/lib/types";

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function squigglePath(rand: () => number, width: number, y: number) {
  const segments = 10 + Math.floor(rand() * 4);
  const segW = width / segments;
  let d = `M 0 ${y}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * segW;
    const jitter = (rand() - 0.5) * 7;
    d += ` L ${x.toFixed(1)} ${(y + jitter).toFixed(1)}`;
  }
  return d;
}

const KIND_STYLES: Record<
  HighlightSpan["kind"],
  { stroke: string; fill: string }
> = {
  correct: { stroke: "hsl(var(--success))", fill: "hsl(var(--success) / 0.12)" },
  missing: { stroke: "hsl(var(--danger))", fill: "hsl(var(--danger) / 0.12)" },
  unclear: { stroke: "hsl(var(--warning))", fill: "hsl(var(--warning) / 0.14)" },
};

export function HandwritingSheet({
  seed,
  highlights,
  lineCount = 9,
  width = 480,
  height = 320,
}: {
  seed: number;
  highlights: HighlightSpan[];
  lineCount?: number;
  width?: number;
  height?: number;
}) {
  const rand = mulberry32(seed * 7919 + 13);
  const lineHeight = height / lineCount;
  const linesWithHighlight = new Map<number, HighlightSpan>();

  // Distribute highlight kinds across a handful of lines, deterministically.
  highlights.forEach((h, i) => {
    const lineIdx = Math.min(
      lineCount - 2,
      Math.floor(((i + 1) * lineCount) / (highlights.length + 1))
    );
    linesWithHighlight.set(lineIdx, h);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      className="rounded-lg"
      role="img"
      aria-label="Scanned answer sheet with AI highlights"
    >
      <rect x={0} y={0} width={width} height={height} fill="hsl(var(--bg-raised))" />
      {/* margin rule */}
      <line
        x1={36}
        y1={0}
        x2={36}
        y2={height}
        stroke="hsl(var(--danger) / 0.35)"
        strokeWidth={1.5}
      />
      {Array.from({ length: lineCount }).map((_, i) => {
        const y = (i + 1) * lineHeight - lineHeight * 0.35;
        const highlight = linesWithHighlight.get(i);
        const textWidth = 60 + rand() * (width - 100);
        return (
          <g key={i}>
            <line
              x1={0}
              y1={(i + 1) * lineHeight}
              x2={width}
              y2={(i + 1) * lineHeight}
              stroke="hsl(var(--border-soft))"
              strokeWidth={1}
            />
            {highlight && (
              <rect
                x={44}
                y={y - lineHeight * 0.55}
                width={Math.min(textWidth + 20, width - 60)}
                height={lineHeight * 0.9}
                rx={4}
                fill={KIND_STYLES[highlight.kind].fill}
                stroke={KIND_STYLES[highlight.kind].stroke}
                strokeWidth={1.2}
              />
            )}
            <path
              d={squigglePath(rand, textWidth, y)}
              transform="translate(52, 0)"
              fill="none"
              stroke="hsl(var(--text-muted))"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.75}
            />
          </g>
        );
      })}
    </svg>
  );
}
