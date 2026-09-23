"use client";

export interface DonutSegment {
  label: string;
  value: number;
  colorVar: string; // e.g. "--success"
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 22,
  centerLabel,
  centerSublabel,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border-soft))"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`hsl(var(${seg.colorVar}))`}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text">{centerLabel}</span>
          {centerSublabel && (
            <span className="text-xs text-text-muted">{centerSublabel}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(var(${seg.colorVar}))` }}
            />
            <span className="text-text-muted">{seg.label}</span>
            <span className="font-semibold text-text">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
