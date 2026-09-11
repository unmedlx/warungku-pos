import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Input — port `registry/react/components/input.tsx` milik Shark UI:
 * `rounded-lg border-input shadow-xs bg-transparent`, placeholder muted/64,
 * fokus = border primary + ring 3px ring/32, invalid = destructive.
 *
 * Tinggi default h-9 (= `lg` Shark) untuk tap-target jari; `text-base` di
 * layar kecil supaya iOS tidak zoom saat fokus.
 */
export const inputClassName = cn(
  'peer flex h-9 w-full min-w-0 px-3',
  'bg-transparent dark:bg-input/30',
  'text-base md:text-sm text-foreground',
  'rounded-lg border border-input shadow-xs',
  'placeholder:text-muted-foreground/60',
  'file:inline-flex file:h-7 file:items-center file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm',
  'transition-[color,box-shadow]',
  'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:text-destructive-text aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/20',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export { Input };
