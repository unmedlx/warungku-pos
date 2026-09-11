import { GoogleLogin } from '@react-oauth/google';
import Logo from './Logo';
import { Alert, Card } from './Common';

/**
 * Backend memverifikasi Google ID token pada tiap request, jadi login di sini
 * cukup menyimpan credential dari Google — tidak ada sesi server terpisah.
 */
export function Login({ onToken, error }: { onToken: (t: string) => void; error?: string | null }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-[380px] p-7">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9 flex-none rounded-xl" />
          <div>
            <div className="text-sm font-semibold leading-tight">Dashboard KanPOS</div>
            <div className="text-xs text-muted-foreground">Laporan pemilik lintas cabang</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Pakai akun Google yang sama dengan yang kamu pakai di aplikasi kasir.
        </p>

        <div className="mt-5 flex justify-center">
          <GoogleLogin
            onSuccess={(res) => res.credential && onToken(res.credential)}
            onError={() => undefined}
            locale="id"
            width="316"
          />
        </div>

        {error && <Alert variant="destructive" title={error} className="mt-4" />}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Dashboard tersedia untuk pengguna Cloud KanPOS aktif.
        </p>
      </Card>
    </div>
  );
}
