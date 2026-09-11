import * as React from "react";

import { cn } from "@/lib/utils";

export interface SegmentedBarDatum {
  label: string;
  value: number;
}

interface SegmentedBarChartProps {
  data: SegmentedBarDatum[];
  /** Capsules per bar — design uses 15 (24×10, rx=5, pitch 11.82). */
  slots?: number;
  /** Highlighted bar; defaults to the largest value. */
  activeIndex?: number;
  onSelect?: (index: number) => void;
  /** Formats the y-axis ticks (e.g. compact currency). */
  formatTick?: (value: number) => string;
  mode?: "bar" | "line";
  className?: string;
}

const SLOT_HEIGHT = 10;
const SLOT_PITCH = 11.8168;
const TICK_COUNT = 5;

function chartHeight(slots: number) {
  return (slots - 1) * SLOT_PITCH + SLOT_HEIGHT;
}

/**
 * Segmented bar chart from design `Transaction Overview.svg`: each bar is a stack
 * of 24×10 rx=5 capsules filled from the bottom — empty `#EFF5FF`, filled
 * `#C0CAEC`, and the active bar in brand `#3554C1`. `mode="line"` renders the
 * same series as the trend line behind the header's second toggle icon.
 */
const SegmentedBarChart = React.forwardRef<HTMLDivElement, SegmentedBarChartProps>(
  ({ data, slots = 15, activeIndex, onSelect, formatTick, mode = "bar", className }, ref) => {
    const max = Math.max(...data.map((d) => d.value), 0);
    const highest = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -Infinity) ? i : best), 0);
    const active = activeIndex ?? highest;
    const height = chartHeight(slots);

    const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
      const value = (max / TICK_COUNT) * (TICK_COUNT - i);
      return formatTick ? formatTick(value) : Math.round(value).toString();
    });

    return (
      <div ref={ref} className={cn("flex gap-3", className)}>
        {/* y-axis */}
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-[11px] font-medium text-muted-foreground/70"
          style={{ height: height + 24 }}
          aria-hidden="true"
        >
          {ticks.map((tick, i) => (
            <span key={i} className="tabular leading-none">{tick}</span>
          ))}
        </div>

        {/* plot — bleeds to the right like the SVG when there are many columns */}
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          {mode === "line" ? (
            <LineSeries data={data} max={max} height={height} active={active} onSelect={onSelect} />
          ) : (
            <div className="flex gap-[23px]">
              {data.map((d, i) => {
                const filled = max > 0 ? Math.round((d.value / max) * slots) : 0;
                const count = d.value > 0 ? Math.max(1, filled) : 0;
                // static columns stay plain elements — a no-op <button> would be focusable
                const Column = onSelect ? "button" : "div";
                return (
                  <Column
                    key={`${d.label}-${i}`}
                    {...(onSelect
                      ? { type: "button" as const, onClick: () => onSelect(i), "aria-pressed": i === active }
                      : {})}
                    aria-label={`${d.label}: ${formatTick ? formatTick(d.value) : d.value}`}
                    className={cn("flex shrink-0 flex-col items-center gap-1.5", onSelect && "cursor-pointer")}
                  >
                    <span
                      className="flex flex-col-reverse justify-start"
                      style={{ height, gap: SLOT_PITCH - SLOT_HEIGHT }}
                    >
                      {Array.from({ length: slots }, (_, s) => (
                        <span
                          key={s}
                          className={cn(
                            "block w-6 rounded-[5px] transition-colors",
                            s < count ? (i === active ? "bg-primary" : "bg-accent-strong") : "bg-accent",
                          )}
                          style={{ height: SLOT_HEIGHT }}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] font-medium leading-none text-muted-foreground/70">
                      {d.label}
                    </span>
                  </Column>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);
SegmentedBarChart.displayName = "SegmentedBarChart";

interface LineSeriesProps {
  data: SegmentedBarDatum[];
  max: number;
  height: number;
  active: number;
  onSelect?: (index: number) => void;
}

function LineSeries({ data, max, height, active, onSelect }: LineSeriesProps) {
  const step = 47;
  const width = Math.max(step * data.length, step);
  const y = (v: number) => height - (max > 0 ? (v / max) * (height - 10) : 0) - 5;
  // centre each point in its column so the labels below line up regardless of text width
  const cx = (i: number) => i * step + step / 2;
  const points = data.map((d, i) => `${cx(i)},${y(d.value)}`).join(" ");

  return (
    <div style={{ width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={cx(i)}
            cy={y(d.value)}
            r={i === active ? 5 : 3.5}
            fill={i === active ? "hsl(var(--primary))" : "hsl(var(--card))"}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex" style={{ width }}>
        {data.map((d, i) => {
          const Label = onSelect ? "button" : "div";
          return (
            <Label
              key={i}
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(i) } : {})}
              style={{ width: step }}
              className="pt-1.5 text-center text-[11px] font-medium leading-none text-muted-foreground/70"
            >
              {d.label}
            </Label>
          );
        })}
      </div>
    </div>
  );
}

export { SegmentedBarChart };
