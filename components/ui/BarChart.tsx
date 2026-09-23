"use client";

import { useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 180,
  barColorVar = "--primary",
}: {
  data: BarDatum[];
  height?: number;
  barColorVar?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div
        className="flex items-end gap-2"
        style={{ height }}
        role="img"
        aria-label="Score distribution bar chart"
      >
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHovered && (
                <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-bg-raised px-2 py-1 text-xs font-medium text-text shadow-raised">
                  {d.value} student{d.value === 1 ? "" : "s"}
                </div>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-200"
                style={{
                  height: `${Math.max(pct, d.value > 0 ? 3 : 0)}%`,
                  backgroundColor: `hsl(var(${barColorVar}) / ${isHovered ? 1 : 0.75})`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[11px] text-text-faint"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
