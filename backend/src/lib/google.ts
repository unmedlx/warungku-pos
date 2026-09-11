import { OAuth2Client } from 'google-auth-library';
import { config } from '@/config';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID[0]);

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  /** Google sudah memastikan pemilik token benar-benar menguasai email ini. */
  emailVerified: boolean;
  name: string;
  picture?: string;
  exp?: number;
}

export async function verifyGoogleIdToken(token: string): Promise<GoogleIdTokenPayload> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Token tidak valid');

    return {
      sub: payload.sub,
      email: payload.email ?? '',
      emailVerified: payload.email_verified === true,
      name: payload.name ?? '',
      picture: payload.picture,
      exp: payload.exp,
    };
  } catch (err) {
    // Penyebab aslinya (audience tidak cocok, token kedaluwarsa, tanda tangan
    // salah) dicatat di server — tanpa ini, salah konfigurasi client ID hanya
    // tampak sebagai "token tidak valid" dan sangat sulit dilacak.
    console.error(
      '[GOOGLE] Verifikasi ID token gagal:',
      err instanceof Error ? err.message : err,
      '| client ID yang diterima:',
      config.GOOGLE_CLIENT_ID.join(', '),
    );
    throw new Error('Verifikasi Google token gagal');
  }
}
