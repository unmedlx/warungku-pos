import * as React from 'react';

import { cn } from '@/lib/utils';

interface UserInfoStat {
  value: React.ReactNode;
  label: React.ReactNode;
}

interface UserInfoProps {
  avatar?: React.ReactNode;
  name: React.ReactNode;
  subtitle?: React.ReactNode;
  stats?: UserInfoStat[];
  className?: string;
  children?: React.ReactNode;
}

/** Kartu profil = Card Shark: avatar 56px bulat, nama 16/600, stat berkolom dipisah garis. */
const UserInfo = React.forwardRef<HTMLDivElement, UserInfoProps>(
  ({ avatar, name, subtitle, stats, className, children }, ref) => (
    <div ref={ref} className={cn('rounded-xl border border-border bg-card p-4 text-center shadow-xs', className)}>
      {avatar && (
        <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {avatar}
        </div>
      )}
      <p className="text-base font-semibold leading-tight">{name}</p>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      {stats && stats.length > 0 && (
        <div className="mt-4 flex border-t border-border pt-3">
          {stats.map((s, i) => (
            <div key={i} className={cn('min-w-0 flex-1', i > 0 && 'border-l border-border')}>
              <p className="truncate text-sm font-semibold tabular-nums">{s.value}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  ),
);
UserInfo.displayName = 'UserInfo';

export { UserInfo };
