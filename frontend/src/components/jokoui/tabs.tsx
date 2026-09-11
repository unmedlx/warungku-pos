import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tabs — port `registry/react/components/tabs.tsx` milik Shark UI.
 *
 * Dua varian list:
 *  - `default`: list `rounded-lg`, tab aktif memakai latar `bg-accent`
 *    (Shark menggambar indikator bergeser; di sini latar dipasang langsung
 *    ke trigger aktif — tanpa animasi geser, hasil visual akhirnya sama).
 *  - `underline`: garis 2px `bg-primary` di bawah tab aktif.
 *
 * Tambahan KanPOS: `variant="pill"` = list dengan latar `bg-muted p-0.5`,
 * tab aktif putih ber-shadow (pola pemilih rentang waktu di Laporan).
 */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

type TabsVariant = 'default' | 'underline' | 'pill';

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value: valueProp, onValueChange: onValueChangeProp, variant = 'default', className, children, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '');
    const isControlled = valueProp !== undefined;
    const value = isControlled ? valueProp : uncontrolled;
    const handleValueChange = (v: string) => {
      if (!isControlled) setUncontrolled(v);
      onValueChangeProp?.(v);
    };
    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange, variant }}>
        <div ref={ref} data-slot="tabs" className={cn('flex w-full flex-col gap-2', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const LIST: Record<TabsVariant, string> = {
  default: 'w-fit gap-x-0.5 rounded-lg',
  underline: 'w-full gap-x-0.5 border-b border-input',
  pill: 'w-fit gap-x-0.5 rounded-lg bg-muted p-0.5',
};

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { variant } = useTabs();
    return (
      <div
        ref={ref}
        role="tablist"
        data-slot="tabs-list"
        className={cn('relative z-0 flex items-center justify-center text-muted-foreground', LIST[variant], className)}
        {...props}
      />
    );
  },
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TRIGGER: Record<TabsVariant, { base: string; active: string }> = {
  default: { base: 'rounded-lg', active: 'bg-accent text-foreground' },
  underline: {
    base: 'rounded-t-lg after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent',
    active: 'text-foreground after:bg-primary',
  },
  pill: { base: 'rounded-md h-8', active: 'bg-background text-foreground shadow-xs' },
};

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selected, onValueChange, variant } = useTabs();
    const active = selected === value;
    const v = TRIGGER[variant];
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? 'active' : 'inactive'}
        data-slot="tabs-trigger"
        onClick={() => onValueChange(value)}
        className={cn(
          'relative flex h-9 shrink-0 grow items-center justify-center gap-1.5 px-2.5',
          'whitespace-nowrap text-sm font-medium',
          'border border-transparent cursor-pointer',
          'transition-[color,background-color,box-shadow]',
          'hover:text-foreground/70',
          'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
          'disabled:pointer-events-none disabled:opacity-60',
          '[&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
          v.base,
          active && v.active,
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selected } = useTabs();
    if (selected !== value) return null;
    return <div ref={ref} role="tabpanel" data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
