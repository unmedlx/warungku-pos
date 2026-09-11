import { useTranslation } from 'react-i18next';
import { AlertTriangle, Replay, Sparkles, Trash2 } from '@/components/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Badge } from '@/components/jokoui/badge';
import { Checkbox } from '@/components/jokoui/checkbox';
import { cn } from '@/lib/utils';
import type { Category, Unit } from '@/lib/db';
import {
  applyMargin,
  isDraftReady,
  num,
  type DraftAlternative,
  type DraftRow,
} from '@/lib/product-draft';

interface Props {
  rows: DraftRow[];
  onChange: (rows: DraftRow[]) => void;
  categories: Category[];
  units: Unit[];
  /**
   * Diisi jalur suara: memutar ulang potongan rekaman tempat baris ini
   * disebut. Kosong untuk jalur foto — tombolnya tidak muncul sama sekali,
   * bukan muncul lalu tidak melakukan apa-apa.
   */
  onPlayRow?: (row: DraftRow) => void;
}

/**
 * Layar tinjauan hasil ekstraksi — satu-satunya pintu masuk produk hasil AI.
 *
 * Dipakai bersama oleh scan foto dan input suara. Keduanya menghasilkan
 * `DraftRow` yang sama, jadi memisahkan komponennya berarti satu tempat untuk
 * memperbaiki aturan kesiapan baris, dan satu tempat pemilik toko belajar
 * membacanya.
 */
export default function ProductDraftReview({ rows, onChange, categories, units, onPlayRow }: Props) {
  const { t } = useTranslation('products');

  const patchRow = (key: string, patch: Partial<DraftRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selectedRows = rows.filter((r) => r.selected);
  const readyRows = selectedRows.filter(isDraftReady);

  /** Tafsir alternatif dipakai sekali lalu hilang — sudah tidak jadi pilihan. */
  const takeAlternative = (row: DraftRow, alt: DraftAlternative) =>
    patchRow(row.key, {
      [alt.field]: String(alt.value),
      alternatives: (row.alternatives ?? []).filter((a) => a !== alt),
    } as Partial<DraftRow>);

  return (
    <>
      <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-xs">
        <p className="text-sm font-semibold">{t('draft.lede')}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" size="sm">
            {t('draft.countReady', { count: readyRows.length })}
          </Badge>
          <Badge variant="warning" size="sm">
            {t('draft.countCheck', { count: selectedRows.length - readyRows.length })}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(applyMargin(rows, 20))}
        >
          <Sparkles />
          {t('draft.margin', { percent: 20 })}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(applyMargin(rows, 30))}
        >
          <Sparkles />
          {t('draft.margin', { percent: 30 })}
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const ready = isDraftReady(r);
          const alts = r.alternatives ?? [];
          return (
            <div
              key={r.key}
              className={cn(
                'space-y-3 rounded-xl border bg-card p-3 shadow-xs transition-colors',
                !r.selected && 'opacity-60',
                r.selected && ready && 'border-border',
                r.selected && !ready && 'border-warning/30 bg-warning/5',
              )}
            >
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={r.selected}
                  onCheckedChange={(v) => patchRow(r.key, { selected: v })}
                  className="mt-2.5 shrink-0"
                  aria-label={t('draft.includeRow')}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    value={r.name}
                    onChange={(e) => patchRow(r.key, { name: e.target.value })}
                    className="font-medium"
                    placeholder={t('draft.namePlaceholder')}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{r.sourceLabel}</span>
                    {r.confidence !== 'high' && (
                      <Badge variant={r.confidence === 'medium' ? 'warning' : 'destructive'} size="sm">
                        {t(`draft.confidence.${r.confidence}`)}
                      </Badge>
                    )}
                    {r.matchedProductId && (
                      <Badge variant="primary" size="sm">
                        {t('draft.willUpdate')}
                      </Badge>
                    )}
                  </div>
                </div>
                {onPlayRow && r.startSec != null && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-primary"
                    onClick={() => onPlayRow(r)}
                    aria-label={t('draft.playSegment')}
                  >
                    <Replay />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                  aria-label={t('draft.removeRow')}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs">{t('draft.hpp')}</Label>
                  <Input
                    inputMode="numeric"
                    value={r.hpp}
                    onChange={(e) => patchRow(r.key, { hpp: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('draft.price')}</Label>
                  <Input
                    inputMode="numeric"
                    value={r.price}
                    onChange={(e) => patchRow(r.key, { price: e.target.value })}
                    className={cn(num(r.price) <= 0 && 'border-warning')}
                    placeholder={t('draft.pricePlaceholder')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('draft.category')}</Label>
                  <Select value={r.categoryId} onValueChange={(v) => patchRow(r.key, { categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('draft.unit')}</Label>
                  <Select value={r.unit} onValueChange={(v) => patchRow(r.key, { unit: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {r.note && (
                <p className="flex items-start gap-1.5 pl-6 text-xs text-warning-text">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {r.note}
                </p>
              )}

              {/* Angka ambigu: sudah terisi dengan tafsir terbaik, sisanya
                  ditawarkan satu ketukan. Mengetik ulang di keyboard HP adalah
                  bagian yang membuat orang berhenti memakai fitur ini. */}
              {alts.length > 0 && (
                <div className="pl-6 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('draft.orMaybe')}</span>
                  {alts.map((a, i) => (
                    <Button
                      key={`${a.field}-${a.value}-${i}`}
                      variant="outline"
                      size="xs"
                      onClick={() => takeAlternative(r, a)}
                    >
                      {t(`draft.field.${a.field}`)} {a.value.toLocaleString('id-ID')}
                      {a.label ? ` · ${a.label}` : ''}
                    </Button>
                  ))}
                </div>
              )}

              {r.matchedProductId && (
                <p className="pl-6 text-xs text-muted-foreground">
                  {t('draft.updateNote', { name: r.matchedProductName })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
