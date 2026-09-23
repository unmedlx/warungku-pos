import * as React from "react";
import { type IconComponent } from "@/components/icons";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  key: string;
  to: string;
  icon: IconComponent;
  label: string;
  isCta?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  onItemClick?: (item: BottomNavItem) => void;
  className?: string;
}

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ items, activeKey, onItemClick, className }, ref) => (
    <nav
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-lg items-center justify-around md:max-w-6xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onItemClick?.(item)}
              className={cn(
                "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 p-2 transition-colors",
                item.isCta
                  ? "text-primary [&>svg]:-mt-5 [&>svg]:h-10 [&>svg]:w-10 [&>svg]:rounded-xl [&>svg]:bg-primary [&>svg]:p-2.5 [&>svg]:text-primary-foreground [&>svg]:shadow-primary"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                undefined,
              )}
            >
              <Icon className={cn("h-5 w-5", item.isCta && "h-6 w-6")} />
              <span className="truncate text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  ),
);
BottomNav.displayName = "BottomNav";

export { BottomNav };
export type { BottomNavItem };
