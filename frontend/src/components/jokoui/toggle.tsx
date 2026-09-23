import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

/**
 * Switch — port `registry/react/components/switch.tsx` milik Shark UI:
 * thumb 20px (mobile), track = thumb×2−2 lebar, checked = primary,
 * unchecked = bg-input, thumb putih. Primitif tetap Radix.
 *
 * API lama dipertahankan: `checked`, `onCheckedChange`, `disabled`.
 */
export interface ToggleProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Toggle = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, ToggleProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        'group/switch inline-flex h-5.5 w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent p-px',
        'transition-all outline-none',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-xs transition-transform',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
          'dark:bg-foreground dark:data-[state=checked]:bg-primary-foreground',
        )}
      />
    </SwitchPrimitive.Root>
  ),
);
Toggle.displayName = 'Toggle';

export { Toggle };
