import * as React from 'react';

import { cn } from '@/lib/utils';

/** Textarea — gaya Input Shark (rounded-lg border-input shadow-xs, ring fokus 3px). */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        'flex min-h-[88px] w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 shadow-xs',
        'text-base md:text-sm text-foreground placeholder:text-muted-foreground/60',
        'dark:bg-input/30',
        'transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
