import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacyStorageKeys } from '@/lib/legacy-storage';

describe('migrasi kunci localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('tidak menghapus sesi cloud yang sedang dipakai', () => {
    localStorage.setItem('kanpos_cloud_session_v2', '{"accessToken":"a"}');

    migrateLegacyStorageKeys();
    migrateLegacyStorageKeys(); // boot kedua — harus tetap ada

    expect(localStorage.getItem('kanpos_cloud_session_v2')).toBe('{"accessToken":"a"}');
  });

  it('memindahkan nilai dari kunci brand lama', () => {
    localStorage.setItem('kankitu_cloud_session_v2', '{"accessToken":"lama"}');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem('kanpos_cloud_session_v2')).toBe('{"accessToken":"lama"}');
    expect(localStorage.getItem('kankitu_cloud_session_v2')).toBeNull();
  });

  it('nilai baru menang atas nilai lama', () => {
    localStorage.setItem('kankitu_money_hidden_v1', '1');
    localStorage.setItem('kanpos_money_hidden_v1', '0');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem('kanpos_money_hidden_v1')).toBe('0');
    expect(localStorage.getItem('kankitu_money_hidden_v1')).toBeNull();
  });
});
