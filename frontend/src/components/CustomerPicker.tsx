import { useState, useRef, useEffect } from 'react';
import { User, Check, Plus } from '@/components/icons';
import { db, type Customer } from '@/lib/db';
import { Input } from '@/components/jokoui/input';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CustomerPickerProps {
  customers: Customer[];
  value: string;          // customerName (snapshot/free text)
  customerId?: number;    // selected master id, if any
  onChange: (name: string, id?: number) => void;
  className?: string;
}

export default function CustomerPicker({ customers, value, customerId, onChange, className }: CustomerPickerProps) {
  const { t } = useTranslation('settings');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const query = value.trim().toLowerCase();
  const matches = query
    ? customers.filter(c =>
      c.name.toLowerCase().includes(query) || c.phone.includes(value.trim()),
    )
    : customers;

  const exactMatch = customers.some(c => c.name.trim().toLowerCase() === query);
  const canQuickCreate = query.length > 0 && !exactMatch;

  const selectCustomer = (c: Customer) => {
    onChange(c.name, c.id);
    setOpen(false);
  };

  const handleInput = (text: string) => {
    onChange(text, undefined);
    setOpen(true);
  };

  const quickCreate = async () => {
    const name = value.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const id = await db.customers.add({
        name,
        phone: '',
        email: '',
        address: '',
        notes: '',
        createdAt: new Date(),
        isDeleted: 0,
        deletedAt: null,
      });
      trackEvent('create_customer');
      onChange(name, id as number);
      toast.success(t('customerPicker.toastAdded', { name }));
      setOpen(false);
    } catch {
      toast.error(t('customerPicker.toastFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <User className="absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={t('customerPicker.placeholder')}
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        className={cn('pl-8', customerId != null && 'pr-8')}
      />
      {customerId != null && (
        <Check className="absolute right-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-success-text" />
      )}

      {open && (matches.length > 0 || canQuickCreate) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {matches.slice(0, 8).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent active:bg-muted"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.phone && <p className="truncate text-xs text-muted-foreground">{c.phone}</p>}
              </div>
              {customerId === c.id && <Check className="w-3.5 h-3.5 text-success-text shrink-0" />}
            </button>
          ))}
          {canQuickCreate && (
            <button
              type="button"
              onClick={quickCreate}
              disabled={creating}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-left text-primary transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="text-sm font-medium truncate">{t('customerPicker.addLabel', { name: value.trim() })}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
