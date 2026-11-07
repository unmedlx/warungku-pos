/*
 * ==========================================
 * OFFLINE MODE - CLOUD SYNC DISABLED
 * ==========================================
 * Cloud Sync functionality has been disabled for offline mode.
 * All sync-related features are now stubbed.
 */

import { db } from './db';

var syncDebounceTimer: any = null;
var isSyncing = false;

export function triggerBackgroundSync() {
  // No-op in offline mode
}

export async function pushSyncData(storeId: string): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Sync disabled in offline mode' };
}

export async function pullSyncData(storeId: string): Promise<{ applied: number; role: string | null }> {
  return { applied: 0, role: null };
}
