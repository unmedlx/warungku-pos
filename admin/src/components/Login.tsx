import Logo from './Logo';
import { GoogleLogin } from '@react-oauth/google';
import { Alert, Card } from './Common';

/**
 * Login tetap lewat Google, tapi credential-nya ditukar sekali dengan sesi
 * milik backend. Akun harus sudah ada dan sudah berperan admin — panel ini
 * tidak membuat pengguna baru.
 */
export function Login({
  onCredential,
  onGoogleError,
  error,
  memuat,
}: {
  onCredential: (idToken: string) => void;
  /** Kegagalan di sisi Google (origin belum terdaftar, popup ditutup/diblokir). */
  onGoogleError: (pesan: string) => void;
  error?: string | null;
  memuat?: boolean;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-[400px] p-7">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9 flex-none" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Admin KanPOS</h1>
            <p className="text-xs text-muted-foreground">
              Panel internal tim · bukan untuk pelanggan
            </p>
          </div>
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">
          Masuk dengan akun Google yang sudah terdaftar sebagai admin. Sesi berlaku 8 jam.
        </p>

        <div className="mt-5 flex min-h-[44px] justify-center">
          {memuat ? (
            <span className="self-center text-[13px] text-muted-foreground">Memeriksa akses…</span>
          ) : (
            <GoogleLogin
              onSuccess={(res) =>
                res.credential
                  ? onCredential(res.credential)
                  : onGoogleError('Google tidak mengirim token. Coba masuk lagi.')
              }
              // Dulu diabaikan diam-diam, sehingga origin yang belum terdaftar di
              // Google Cloud Console tampak seperti tombol yang tidak bereaksi.
              onError={() =>
                onGoogleError(
                  `Login Google gagal. Pastikan ${window.location.origin} terdaftar sebagai Authorized JavaScript origin di Google Cloud Console, lalu coba lagi.`,
                )
              }
              locale="id"
              width="336"
            />
          )}
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="mt-4"
            title={error}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            }
          />
        )}

        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          Belum punya akses? Minta superadmin menjalankan{' '}
          <code className="kode rounded border border-border bg-muted px-1 py-0.5">
            npm run admin -- promote &lt;email&gt;
          </code>{' '}
          di backend. Setiap tindakan di panel ini tercatat di audit log.
        </p>
      </Card>
    </div>
  );
}
