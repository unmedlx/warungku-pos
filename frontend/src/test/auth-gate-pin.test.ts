import { describe, it, expect, beforeEach } from 'vitest';
import { db, type User } from '@/lib/db';
import { cariUserTanpaPin } from '@/lib/members';

/**
 * Penjaga layar "buat PIN" di gerbang akun.
 *
 * Kasus yang paling menentukan ada di bawah: pemilik toko yang install ulang
 * juga punya baris user dengan `pinHash` kosong (dibuat `syncCloudMembers`),
 * tapi perangkatnya bukan multi-user — dia tidak boleh diminta PIN.
 */
async function setSettings(multiUserEnabled: boolean) {
  await db.storeSettings.clear();
  await db.storeSettings.add({
    storeName: 'Toko Uji',
    address: '',
    phone: '',
    receiptFooter: '',
    printLogo: false,
    onboardingDone: true,
    lastBackupAt: null,
    deviceId: 'device-uji',
    multiUserEnabled,
  } as never);
}

async function addUser(over: Partial<User>) {
  await db.users.add({
    username: 'rina',
    pinHash: '',
    name: 'Rina',
    role: 'staff',
    permissions: [],
    isActive: 1,
    createdAt: new Date(),
    lastLoginAt: null,
    updatedAt: new Date(),
    cloudUserId: 'cloud-1',
    cloudEmail: 'rina@gmail.com',
    ...over,
  } as User);
}

describe('cariUserTanpaPin', () => {
  beforeEach(async () => {
    await db.users.clear();
    await db.storeSettings.clear();
  });

  it('mengembalikan karyawan yang belum punya PIN di perangkat multi-user', async () => {
    await setSettings(true);
    await addUser({});
    const hasil = await cariUserTanpaPin('rina@gmail.com');
    expect(hasil?.username).toBe('rina');
  });

  it('melewati pemilik toko: perangkatnya bukan multi-user', async () => {
    await setSettings(false);
    await addUser({ username: 'budi', role: 'owner', cloudEmail: 'budi@gmail.com' });
    expect(await cariUserTanpaPin('budi@gmail.com')).toBeNull();
  });

  it('melewati user yang PIN-nya sudah ada', async () => {
    await setSettings(true);
    await addUser({ pinHash: 'abc123' });
    expect(await cariUserTanpaPin('rina@gmail.com')).toBeNull();
  });

  it('melewati anggota yang aksesnya sudah dicabut', async () => {
    await setSettings(true);
    await addUser({ isActive: 0 });
    expect(await cariUserTanpaPin('rina@gmail.com')).toBeNull();
  });

  it('tidak tertukar dengan anggota lain', async () => {
    await setSettings(true);
    await addUser({});
    expect(await cariUserTanpaPin('orang.lain@gmail.com')).toBeNull();
  });

  it('cocok walau beda huruf besar-kecil', async () => {
    await setSettings(true);
    await addUser({});
    expect((await cariUserTanpaPin('Rina@Gmail.com'))?.username).toBe('rina');
  });

  it('mengembalikan null kalau email tidak diketahui', async () => {
    await setSettings(true);
    await addUser({});
    expect(await cariUserTanpaPin(null)).toBeNull();
    expect(await cariUserTanpaPin('  ')).toBeNull();
  });

  it('mengembalikan null kalau pengaturan toko belum ada', async () => {
    await addUser({});
    expect(await cariUserTanpaPin('rina@gmail.com')).toBeNull();
  });
});
