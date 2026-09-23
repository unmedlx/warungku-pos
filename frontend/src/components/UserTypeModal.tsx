import { useState, useMemo } from 'react';
import { Store, Check } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_KEYS,
  SKIP_LIMIT,
  getSkipCount,
  incrementSkipCount,
  dismissUserTypeSurvey,
  markUserTypeAnswered,
  submitUserType,
} from '@/lib/user-type';

interface UserTypeModalProps {
  open: boolean;
  /** Dipanggil saat modal harus ditutup (apa pun alasannya). */
  onClose: () => void;
}

const OTHER_VALUE = 'Lainnya';

/**
 * Survei jenis usaha. Muncul saat user membuka halaman Laporan bila belum dijawab.
 * Boleh di-skip; setelah {@link SKIP_LIMIT} kali skip, tampilkan opsi
 * "Jangan tampilkan lagi".
 */
export default function UserTypeModal({ open, onClose }: UserTypeModalProps) {
  const { t } = useTranslation('reports');
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(
    () => BUSINESS_TYPES.map((value, i) => ({ value, label: t(`survey.types.${BUSINESS_TYPE_KEYS[i]}`) })),
    [t],
  );

  // Snapshot saat render: bila sudah melewati batas skip, tawarkan opsi
  // untuk tidak menampilkan lagi.
  const offerDontShowAgain = getSkipCount() >= SKIP_LIMIT;

  const isOther = selected === OTHER_VALUE;
  // Saat "Lainnya", value yang dikirim adalah teks bebas yang diisi user.
  const value = isOther ? otherText.trim() : selected;
  const canSubmit = !!value && !submitting;

  if (!open) return null;

  const handleSubmit = async () => {
    if (!canSubmit || !value) return;
    setSubmitting(true);
    markUserTypeAnswered(); // tandai dulu agar tidak muncul lagi meski request gagal
    void submitUserType(value);
    setSubmitting(false);
    toast.success(t('survey.thankYou'));
    onClose();
  };

  const handleSkip = () => {
    incrementSkipCount();
    onClose();
  };

  const handleDontShowAgain = () => {
    dismissUserTypeSurvey();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background p-5 space-y-4 border border-transparent shadow-lift dark:border-border dark:shadow-none">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold leading-snug">
            {t('survey.title')}
          </h2>
          <p className="text-xsm text-muted-foreground">
            {t('survey.description')}
          </p>
        </div>

        {/* Pilihan jenis usaha: item outline yang bisa dipilih */}
        <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
          {options.map(({ value, label }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xsm font-medium text-left transition-colors',
                  active ? 'border-primary bg-primary/5 text-foreground' : 'border-border hover:bg-muted',
                )}
              >
                <span className="truncate">{label}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>

        {isOther && (
          <Input
            autoFocus
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            maxLength={60}
            placeholder={t('survey.otherPlaceholder')}
          />
        )}

        <div className="space-y-2 pt-1">
          <Button
            size="xl"
            className="w-full"
            disabled={!canSubmit}
            isLoading={submitting}
            onClick={handleSubmit}
          >
            {t('survey.submit')}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleSkip}
            disabled={submitting}
          >
            {t('survey.skip')}
          </Button>
          {offerDontShowAgain && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleDontShowAgain}
              disabled={submitting}
            >
              {t('survey.dontShowAgain')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
