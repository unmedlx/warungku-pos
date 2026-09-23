import * as React from "react";

import { cn } from "@/lib/utils";

interface CustomerTypesProps {
  /** Segmented control options; first entry is active by default. */
  segments: { key: string; label: React.ReactNode; color?: "primary" | "success" | "purple" }[];
  value?: string;
  onValueChange?: (key: string) => void;
  /** `sm` = exact SVG size (27px track); `default` = 44px touch-friendly track. */
  size?: "sm" | "default";
  className?: string;
}

const segmentColor: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  purple: "bg-[#CB5CFE] text-white",
};

/**
 * Customer type segmented control matching design `Customer Types Container.svg`
 * (318×27 track with rx=7.5 stroke #ECEFF3, colored pill segments inside).
 */
const CustomerTypes = React.forwardRef<HTMLDivElement, CustomerTypesProps>(
  ({ segments, value, onValueChange, size = "default", className }, ref) => {
    const [internal, setInternal] = React.useState(segments[0]?.key ?? "");
    const active = value ?? internal;
    const handle = (k: string) => {
      if (value === undefined) setInternal(k);
      onValueChange?.(k);
    };
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "flex w-full items-center gap-1 rounded-[7.5px] border border-muted bg-card",
          size === "sm" ? "h-[27px] p-0.5" : "h-11 rounded-xl p-1",
          className,
        )}
      >
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active === s.key}
            onClick={() => handle(s.key)}
            className={cn(
              "flex-1 min-w-0 truncate font-medium transition-all",
              size === "sm" ? "h-5 rounded-[6px] text-2xs" : "h-9 rounded-lg px-1 text-xs",
              active === s.key ? segmentColor[s.color ?? "primary"] : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  },
);
CustomerTypes.displayName = "CustomerTypes";

export { CustomerTypes };
