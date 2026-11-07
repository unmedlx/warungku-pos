/*
 * ==========================================
 * OFFLINE MODE - VISION API DISABLED
 * ==========================================
 * Vision API functionality has been disabled for offline mode.
 * All AI/scan-related features are now stubs.
 */

export type ScanConfidence = 'high' | 'medium' | 'low';

export interface ScannedProduct {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: ScanConfidence;
  note: string | null;
  imageIndex: number;
}

export interface ScanQuota {
  limit: number;
  used: number;
  remaining: number;
  source: 'plan' | 'free';
  resetsAt: string;
}

export interface ScanStatus {
  enabled: boolean;
  speechEnabled: boolean;
  transcriptEnabled: boolean;
  maxImages: number;
  maxAudioSeconds: number;
  quota: ScanQuota;
}

export interface SpokenAlternative {
  field: 'hpp' | 'price' | 'qty';
  value: number;
  label: string | null;
}

export interface SpokenProduct {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: ScanConfidence;
  note: string | null;
  startSec: number | null;
  endSec: number | null;
  heard: string | null;
  alternatives: SpokenAlternative[];
}

export interface SpeechResponse {
  products: SpokenProduct[];
  transcript: string | null;
  unreadableReason: string | null;
  quota: ScanQuota;
}

export interface CatalogHints {
  productNames: string[];
  units: string[];
  categories: string[];
  businessMode: 'retail' | 'wholesale' | 'resto';
}

export interface ScanResponse {
  products: ScannedProduct[];
  unreadableReason: string | null;
  quota: ScanQuota;
}

export async function fetchScanStatus(): Promise<ScanStatus> {
  return { enabled: false, speechEnabled: false, transcriptEnabled: false, maxImages: 0, maxAudioSeconds: 0, quota: { limit: 0, used: 0, remaining: 0, source: 'free', resetsAt: '' } };
}

export class ScanTimeoutError extends Error {
  constructor() {
    super('SCAN_TIMEOUT');
    this.name = 'ScanTimeoutError';
  }
}

export class ScanAbortedError extends Error {
  constructor() {
    super('SCAN_ABORTED');
    this.name = 'ScanAbortedError';
  }
}

export async function scanProducts(files: File[], opts?: any): Promise<ScanResponse> {
  throw new Error('Vision API disabled in offline mode');
}

export { CloudApiError } from './cloud-api';

export async function scanProductsFromAudio(recording: any, hints: CatalogHints, opts?: any): Promise<SpeechResponse> {
  throw new Error('Vision API disabled in offline mode');
}

export async function parseProductsFromTranscript(transcript: string, hints: CatalogHints, opts?: any): Promise<SpeechResponse> {
  throw new Error('Vision API disabled in offline mode');
}
