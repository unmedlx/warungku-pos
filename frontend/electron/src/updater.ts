import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { BrowserWindow } from 'electron';
import { app, ipcMain, net } from 'electron';

/**
 * Update KanPOS Windows dari KanPOS Cloud (bukan electron-updater: server
 * tidak menyajikan latest.yml). Pengecekan dan unduhan sengaja di proses
 * utama — CSP renderer produksi hanya mengizinkan skema aplikasi, jadi fetch
 * ke API dari halaman akan diblokir.
 *
 * Installer NSIS dijalankan dengan `/S` (senyap). Kalau pengguna memilih
 * "Nanti", installer dijalankan saat aplikasi ditutup.
 */

const dir = () => {
  const d = join(app.getPath('userData'), 'updates');
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
};
const exePath = (versionCode: number) => join(dir(), `${versionCode}.exe`);

let aktif: Electron.ClientRequest | null = null;
let siapDipasang: string | null = null;

function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

function unduh(url: string, part: string, onProgress: (d: number, t: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const sudah = existsSync(part) ? statSync(part).size : 0;
    const req = net.request({ url, redirect: 'follow' });
    if (sudah > 0) req.setHeader('Range', `bytes=${sudah}-`);
    aktif = req;

    req.on('response', (res) => {
      if (res.statusCode === 416) return resolve();
      if (res.statusCode !== 200 && res.statusCode !== 206) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const lanjut = res.statusCode === 206;
      const panjang = Number(res.headers['content-length'] ?? 0);
      const total = panjang > 0 ? panjang + (lanjut ? sudah : 0) : 0;
      let terbaca = lanjut ? sudah : 0;
      let terakhir = 0;
      const out = createWriteStream(part, { flags: lanjut ? 'a' : 'w' });

      res.on('data', (chunk: Buffer) => {
        out.write(chunk);
        terbaca += chunk.length;
        const now = Date.now();
        if (now - terakhir > 250) {
          terakhir = now;
          onProgress(terbaca, total);
        }
      });
      res.on('end', () => {
        onProgress(terbaca, total || terbaca);
        out.end(() => resolve());
      });
      res.on('error', (e: Error) => {
        out.end();
        reject(e);
      });
    });
    req.on('error', reject);
    req.on('abort', () => reject(Object.assign(new Error('Unduhan dibatalkan'), { code: 'CANCELLED' })));
    req.end();
  });
}

function jalankanInstaller(path: string, bukaLagi: boolean) {
  const args = ['/S'];
  // --force-run: installer NSIS electron-builder membuka aplikasi setelah selesai.
  if (bukaLagi) args.push('--force-run');
  spawn(path, args, { detached: true, stdio: 'ignore' }).unref();
}

export function setupUpdater(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('kanpos-updater:check', async (_e, url: string) => {
    const res = await net.fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  ipcMain.handle('kanpos-updater:downloaded', (_e, versionCode: number) => existsSync(exePath(versionCode)));

  ipcMain.handle(
    'kanpos-updater:download',
    async (_e, opts: { url: string; sha256: string; versionCode: number }) => {
      const target = exePath(opts.versionCode);
      if (!existsSync(target)) {
        for (const f of readdirSync(dir())) {
          if (!f.startsWith(`${opts.versionCode}.`)) unlinkSync(join(dir(), f));
        }
        const part = join(dir(), `${opts.versionCode}.part`);
        let galat: unknown;
        for (let i = 0; i < 3; i++) {
          try {
            await unduh(opts.url, part, (downloaded, total) =>
              getWindow()?.webContents.send('kanpos-updater:progress', { downloaded, total }),
            );
            galat = null;
            break;
          } catch (e) {
            galat = e;
            if ((e as { code?: string }).code === 'CANCELLED') break;
            await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
          }
        }
        aktif = null;
        if (galat) throw galat;
        if (opts.sha256 && (await sha256(part)).toLowerCase() !== opts.sha256.toLowerCase()) {
          unlinkSync(part);
          throw Object.assign(new Error('File update rusak. Coba unduh lagi.'), { code: 'CHECKSUM' });
        }
        renameSync(part, target);
      }
      siapDipasang = target;
      return { path: target };
    },
  );

  ipcMain.handle('kanpos-updater:cancel', () => {
    aktif?.abort();
  });

  ipcMain.handle('kanpos-updater:install', (_e, versionCode: number) => {
    const target = exePath(versionCode);
    if (!existsSync(target)) throw new Error('File update tidak ditemukan');
    siapDipasang = null;
    jalankanInstaller(target, true);
    app.quit();
  });

  // "Nanti": pasang diam-diam saat aplikasi ditutup.
  app.on('will-quit', () => {
    if (siapDipasang && existsSync(siapDipasang)) jalankanInstaller(siapDipasang, false);
  });
}
