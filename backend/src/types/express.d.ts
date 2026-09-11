import { Store, StoreMember, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      googlePayload?: {
        sub: string;
        email: string;
        name: string;
        picture?: string;
      };
      /** Diisi oleh `requireStoreRole` — peran user yang login di toko ini. */
      membership?: StoreMember;
      store?: Store;
      /**
       * Pemilik toko, yaitu penanggung langganan. Kuota dan masa aktif selalu
       * dibaca dari sini, bukan dari `req.user` yang bisa saja karyawan.
       */
      storeOwner?: User;
    }
  }
}

export {};
