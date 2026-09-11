import * as React from 'react';

import { cn } from '@/lib/utils';

interface UserGreetingProps {
  greeting?: React.ReactNode;
  name?: React.ReactNode;
  meta?: React.ReactNode;
  avatar?: React.ReactNode;
  avatarPosition?: 'leading' | 'trailing';
  onAvatarClick?: () => void;
  action?: React.ReactNode;
  /** Diterima demi kompat; header Shark selalu polos. */
  variant?: 'plain' | 'pill';
  className?: string;
}

/**
 * Header Beranda gaya Shark: avatar 40px bulat, nama 18/600, sapaan 12 muted,
 * aksi (tombol ikon outline) di kanan. Tanpa pil, tanpa shadow.
 */
const UserGreeting = React.forwardRef<HTMLDivElement, UserGreetingProps>(
  ({ greeting, name, meta, avatar, avatarPosition = 'leading', onAvatarClick, action, className }, ref) => {
    const avatarNode = avatar ? (
      onAvatarClick ? (
        <button
          type="button"
          onClick={onAvatarClick}
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-95"
        >
          {avatar}
        </button>
      ) : (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">{avatar}</div>
      )
    ) : null;

    return (
      <div ref={ref} className={cn('flex h-14 w-full items-center justify-between gap-3', className)}>
        <div className="flex min-w-0 items-center gap-2.5">
          {avatarPosition === 'leading' && avatarNode}
          <div className="min-w-0">
            {name && <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{name}</h1>}
            {(greeting || meta) && (
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {greeting}
                {greeting && meta ? ' · ' : ''}
                {meta}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {avatarPosition === 'trailing' && avatarNode}
          {action}
        </div>
      </div>
    );
  },
);
UserGreeting.displayName = 'UserGreeting';

export { UserGreeting };
