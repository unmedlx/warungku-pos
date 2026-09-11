import { useState, useRef, useEffect } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, Store, LogIn } from '@/components/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/db';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription } from '@/components/jokoui/alert';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export default function LoginScreen() {
  const { t } = useTranslation('settings');
  const { login } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(username, pin);
      if (!result.ok) {
        setError(result.error || t('loginScreen.loginFailed'));
        setPin('');
        pinRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        {/* Store header */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo toko: kotak 64px, bukan lingkaran glow */}
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-primary flex items-center justify-center overflow-hidden mb-4">
            {storeSettings?.logo ? (
              <img src={storeSettings.logo} alt={t('loginScreen.logoAlt')} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">{storeSettings?.storeName || t('loginScreen.storeFallback')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('loginScreen.continuePrompt')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              {t('loginScreen.usernameLabel')}
            </Label>
            <Input
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('loginScreen.usernamePlaceholder')}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin" className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-muted-foreground" />
              {t('loginScreen.pinLabel')}
            </Label>
            <div className="relative">
              <Input
                id="pin"
                ref={pinRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder={t('loginScreen.pinPlaceholder')}
                autoComplete="current-password"
                className="h-11 pr-11 text-center text-xl font-semibold tracking-widest"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPin ? t('loginScreen.hidePin') : t('loginScreen.showPin')}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-fade-in" aria-live="assertive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="xl"
            className="w-full mt-2"
            disabled={submitting || !username.trim() || pin.length < 4}
          >
            <LogIn />
            {submitting ? t('loginScreen.loggingIn') : t('loginScreen.loginButton')}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {t('loginScreen.forgotPin')}
        </p>
      </div>
    </div>
  );
}
