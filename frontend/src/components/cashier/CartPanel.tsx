import { Hash, Minus, Package as PackageIcon, Pencil, Plus, Tag, Trash2, X } from '@/components/icons';
import type { TFunction } from 'i18next';
import type { Product, Customer } from '@/lib/db';
import { unitPrice } from '@/lib/price-tiers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/jokoui/item';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import CustomerPicker from '@/components/CustomerPicker';

export interface CartItem {
  product: Product;
  qty: number;
  /**
   * Tingkat harga yang dipilih manual (lihat `lib/price-tiers`).
   * `undefined` = ikut pemilihan otomatis berdasarkan jumlah.
   */
  tierName?: string;
  discountType: 'percentage' | 'nominal' | null;
  discountValue: number;
  notes?: string;
  /**
   * Baris ini masuk lewat suara, bukan ketukan.
   *
   * Dipakai untuk penanda kecil di keranjang. Bukan hiasan: kalau ada yang
   * keliru, kasir tahu duluan di baris mana harus curiga.
   */
  fromVoice?: boolean;
}

// === Cart item list (shared by desktop panel & mobile sheet) ===

interface CartItemsProps {
  cart: CartItem[];
  t: TFunction;
  rp: (n: number) => string;
  editingItemNotes: number | null;
  tempItemNotes: string;
  onTempItemNotesChange: (v: string) => void;
  onEditingItemNotesChange: (id: number | null) => void;
  onUpdateQty: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onSetQty: (item: CartItem, val: number) => number;
  onSaveNotes: (productId: number, notes: string) => void;
  onOpenDiscount: (item: CartItem) => void;
  getItemDiscountAmount: (item: CartItem) => number;
  getItemSubtotal: (item: CartItem) => number;
}

export function CartItems({
  cart,
  t,
  rp,
  editingItemNotes,
  tempItemNotes,
  onTempItemNotesChange,
  onEditingItemNotesChange,
  onUpdateQty,
  onRemove,
  onSetQty,
  onSaveNotes,
  onOpenDiscount,
  getItemDiscountAmount,
  getItemSubtotal,
}: CartItemsProps) {
  return (
    <>
      {cart.map(item => (
        <Item key={item.product.id} className="flex-wrap gap-y-2">
          <ItemMedia tone="muted">
            {item.product.photo ? <img src={item.product.photo} alt="" /> : <PackageIcon />}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{item.product.name}</ItemTitle>
            <ItemDescription className="tabular-nums">
              {/* Penanda asal-suara. Kalau ada yang keliru di keranjang, baris
                  inilah yang paling layak dicurigai lebih dulu. */}
              {item.fromVoice && (
                <span className="mr-1.5 rounded bg-accent px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary align-middle">
                  {t('cashier.voice.tag')}
                </span>
              )}
              {rp(unitPrice(item.product, item.qty, item.tierName))} × {item.qty}
            </ItemDescription>
            {item.discountType && getItemDiscountAmount(item) > 0 && (
              <p className="text-xs text-destructive-text tabular-nums">
                {t('cashier.cartDiscount.label')}: {item.discountType === 'percentage' ? `${item.discountValue}%` : rp(item.discountValue)} (-{rp(getItemDiscountAmount(item))})
              </p>
            )}
          </ItemContent>
          <ItemActions className="flex-col items-end gap-1">
            <span className="text-sm font-semibold tabular-nums">{rp(getItemSubtotal(item))}</span>
            {/* Stepper qty gaya Number Input: satu kotak bergaris, angka di tengah
                tetap bisa diketik manual — penting untuk grosir. */}
            <div className="inline-flex h-8 items-stretch overflow-hidden rounded-lg border border-input shadow-xs dark:bg-input/30" role="group">
              <button
                type="button"
                aria-label={item.qty === 1 ? t('cashier.qty.remove') : t('cashier.qty.decrease')}
                className={cn('flex w-8 items-center justify-center transition-colors hover:bg-muted active:bg-accent', item.qty === 1 && 'text-destructive-text')}
                onClick={() => item.qty === 1 ? onRemove(item.product.id!) : onUpdateQty(item.product.id!, -1)}
              >
                {item.qty === 1 ? <X className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <input
                key={item.qty}
                type="number"
                inputMode="numeric"
                defaultValue={item.qty}
                aria-label={t('cashier.qty.inputLabel')}
                onBlur={e => {
                  const val = parseInt(e.target.value);
                  e.target.value = String(onSetQty(item, val));
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="w-10 border-x border-input bg-transparent text-center text-sm font-medium tabular-nums outline-none focus-visible:bg-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label={t('cashier.qty.increase')}
                className="flex w-8 items-center justify-center transition-colors hover:bg-muted active:bg-accent"
                onClick={() => onUpdateQty(item.product.id!, 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </ItemActions>

          <div className="flex w-full flex-wrap items-center gap-1.5">
            {item.notes ? (
              <Button
                variant="outline"
                size="xs"
                className="max-w-[160px]"
                onClick={() => { onEditingItemNotesChange(item.product.id!); onTempItemNotesChange(item.notes || ''); }}
              >
                <Pencil />
                <span className="truncate">{item.notes}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => { onEditingItemNotesChange(item.product.id!); onTempItemNotesChange(''); }}
              >
                <Pencil />
                {t('cashier.itemNotes.add')}
              </Button>
            )}
            {item.discountType ? (
              <Button
                variant="outline"
                size="xs"
                className="border-destructive/30 text-destructive-text"
                onClick={() => onOpenDiscount(item)}
              >
                <Tag />
                {t('cashier.itemDiscount.change')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => onOpenDiscount(item)}
              >
                <Tag />
                {t('cashier.itemDiscount.add')}
              </Button>
            )}
          </div>

          {editingItemNotes === item.product.id && (
            <div className="flex w-full items-center gap-2">
              <Input
                autoFocus
                value={tempItemNotes}
                onChange={e => onTempItemNotesChange(e.target.value)}
                placeholder={t('cashier.itemNotes.placeholder')}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onSaveNotes(item.product.id!, tempItemNotes); onEditingItemNotesChange(null); }
                  if (e.key === 'Escape') onEditingItemNotesChange(null);
                }}
              />
              <Button onClick={() => { onSaveNotes(item.product.id!, tempItemNotes); onEditingItemNotesChange(null); }}>
                {t('cashier.buttons.ok')}
              </Button>
            </div>
          )}
        </Item>
      ))}
    </>
  );
}

// === Customer / table inputs (shared by desktop panel & mobile sheet) ===

interface CustomerTableInputsProps {
  customers: Customer[];
  customerName: string;
  customerId: number | undefined;
  onCustomerChange: (name: string, id?: number) => void;
  tableNumber: string;
  onTableNumberChange: (v: string) => void;
  t: TFunction;
}

export function CustomerTableInputs({
  customers,
  customerName,
  customerId,
  onCustomerChange,
  tableNumber,
  onTableNumberChange,
  t,
}: CustomerTableInputsProps) {
  return (
    <div className="flex gap-2">
      <CustomerPicker
        customers={customers}
        value={customerName}
        customerId={customerId}
        onChange={onCustomerChange}
        className="flex-1"
      />
      <div className="relative flex-[0.6]">
        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder={t('cashier.checkout.table')}
          value={tableNumber}
          onChange={e => onTableNumberChange(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}

// === Cart summary + actions (shared by desktop panel & mobile sheet) ===

interface CartSummaryProps {
  t: TFunction;
  rp: (n: number) => string;
  subtotal: number;
  total: number;
  txDiscountType: 'percentage' | 'nominal' | null;
  txDiscountValue: string;
  txDiscountAmount: number;
  isCartEmpty: boolean;
  isEditingBill: boolean;
  canCancelBill: boolean;
  onEditDiscount: () => void;
  onSaveBill: () => void;
  onPay: () => void;
  onCancelBill: () => void;
}

export function CartSummary({
  t,
  rp,
  subtotal,
  total,
  txDiscountType,
  txDiscountValue,
  txDiscountAmount,
  isCartEmpty,
  isEditingBill,
  canCancelBill,
  onEditDiscount,
  onSaveBill,
  onPay,
  onCancelBill,
}: CartSummaryProps) {
  return (
    <div className="space-y-3">
      <DataList>
        <DataListRow label={t('cashier.cartDiscount.subtotal')} value={rp(subtotal)} />
        <DataListRow
          label={t('cashier.cartDiscount.discount')}
          value={
            txDiscountAmount > 0 ? (
              <button type="button" onClick={onEditDiscount} className="inline-flex items-center gap-1.5 text-destructive-text tabular-nums">
                {txDiscountType === 'percentage' && <span className="text-xs">{txDiscountValue}%</span>}
                -{rp(txDiscountAmount)}
                <span className="text-xs font-medium text-primary">{t('cashier.cartDiscount.change')}</span>
              </button>
            ) : (
              <button type="button" onClick={onEditDiscount} className="inline-flex items-center gap-1 text-primary">
                <Tag className="h-3.5 w-3.5" />
                {t('cashier.cartDiscount.add')}
              </button>
            )
          }
        />
        <DataListRow total label={t('cashier.cartDiscount.total')} value={rp(total)} valueClassName="text-lg" />
      </DataList>

      <div className="flex gap-2">
        <Button variant="outline" size="xl" className="flex-1" onClick={onSaveBill} disabled={isCartEmpty}>
          {t('cashier.buttons.saveBill')}
        </Button>
        <Button size="xl" className="flex-[2]" onClick={onPay}>
          {t('cashier.buttons.pay')} {rp(total)}
        </Button>
      </div>

      {isEditingBill && canCancelBill && (
        <Button
          variant="outline"
          className="w-full text-destructive-text border-destructive/30 hover:bg-destructive/5"
          onClick={onCancelBill}
        >
          <Trash2 />
          {t('cashier.buttons.cancelBill')}
        </Button>
      )}
    </div>
  );
}
