import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from '@/components/icons';

import { cn } from '@/lib/utils';

/**
 * Checkbox — gaya Shark: kotak `rounded-sm border-input shadow-xs`, checked =
 * fill primary, fokus ring 3px. Primitif tetap Radix.
 *
 * API lama dipertahankan: `checked`, `onCheckedChange`, `size` (16/20px).
 */
export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'default';
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, size = 'default', onCheckedChange, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      className={cn(
        'peer shrink-0 rounded-sm border border-input bg-transparent shadow-xs',
        'transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
