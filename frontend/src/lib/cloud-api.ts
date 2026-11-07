/*
 * ==========================================
 * OFFLINE MODE - CLOUD API DISABLED
 * ==========================================
 * Cloud API functionality has been disabled for offline mode.
 * All cloud-related features are now stubbed.
 */

const BASE_URL = (import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:3210').replace(/\/$/, '');
export const CLOUD_API_URL = BASE_URL;

let tokenGetter: () => string | null = () => null;
export function setCloudTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

let refreshHandler: (() => Promise<boolean>) | null = null;
export function setCloudRefreshHandler(fn: (() => Promise<boolean>) | null) {
  refreshHandler = fn;
}

// === Types ===
export type PlanCategory = 'STORAGE' | 'SYNC';

export interface Plan {
  id: string;
  name: string;
  storageLimitMb: number;
  price: number;
  category: PlanCategory;
  maxStores: number | null;
  maxMembers?: number | null;
}

export interface StorageUsage {
  usedBytes?: number;
  usedMb: number;
  limitMb: number;
  remainingMb: number;
}

export interface Subscription {
  id: string;
  planId: string;
  plan: Plan;
  startDate: string;
  endDate: string;
  status: string;
  hasActiveSubscription: boolean;
}

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  planId: string | null;
  storageLimitMb: number;
  syncExpiry: string | null;
  maxStores?: number | null;
  createdAt: string;
}

export interface CloudBackup {
  id: string;
  userId?: string;
  fileName: string;
  fileKey?: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudStore {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  identifier?: string | null;
  address1?: string | null;
  address2?: string | null;
  provinceId?: number | null;
  provinceName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  timezone?: string | null;
  operationalHours?: any;
  logoUrl?: string | null;
  role?: StoreRole | null;
  isOwner?: boolean | null;
  _count?: {
    products: number;
    storeTransactions: number;
    backups: number;
  };
}

export type StoreRole = 'OWNER' | 'ADMIN' | 'STAFF';

export interface StoreMember {
  id: string;
  userId: string;
  storeId: string;
  role: StoreRole;
  permissions: string[] | null;
  name: string | null;
  email: string | null;
  picture: string | null;
  joinedAt: string;
}

export interface StoreInvite {
  id: string;
  storeId: string;
  email: string;
  role: StoreRole;
  permissions: string[] | null;
  code: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserProfile {
  user: CloudUser;
  subscription: Subscription | null;
  syncSubscription: Subscription | null;
  storageUsage: StorageUsage;
  backups: CloudBackup[];
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

export interface CheckoutResult {
  message: string;
  paymentLink: string;
  transaction: { id: string; status: string; planId: string; amount: number };
}

export interface VerifyResult {
  message: string;
  transaction: { id: string; status: string };
}

export interface PaymentTransaction {
  id: string;
  userId?: string;
  planId: string;
  amount: number;
  status: string;
  paymentGatewayRef?: string;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

export class CloudApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'CloudApiError';
    this.status = status;
    this.body = body;
  }
}

export async function cloudFetch(path: string, init?: RequestInit): Promise<unknown> {
  throw new CloudApiError('Cloud API disabled in offline mode', 503, null);
}

// All API functions are stubs in offline mode
export async function fetchPlans(): Promise<Plan[]> { return []; }
export async function createSession(idToken: string): Promise<any> { throw new Error('Cloud disabled'); }
export async function refreshSession(refreshToken: string): Promise<any> { throw new Error('Cloud disabled'); }
export async function fetchBootstrap(timeoutMs?: number): Promise<any> { throw new Error('Cloud disabled'); }
export async function fetchProfile(): Promise<UserProfile> { throw new Error('Cloud disabled'); }
export async function listBackups(params?: PageParams): Promise<Paginated<CloudBackup>> { return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0, hasMore: false } }; }
export async function uploadBackup(jsonString: string, fileName: string, storeId?: string): Promise<CloudBackup> { throw new Error('Cloud disabled'); }
export async function downloadBackup(id: string): Promise<any> { throw new Error('Cloud disabled'); }
export async function deleteBackup(id: string): Promise<void> { throw new Error('Cloud disabled'); }
export async function checkoutPlan(planId: string, opts?: any): Promise<CheckoutResult> { throw new Error('Cloud disabled'); }
export async function verifyPayment(transactionId: string): Promise<VerifyResult> { throw new Error('Cloud disabled'); }
export async function fetchPaymentHistory(params?: PageParams): Promise<Paginated<PaymentTransaction>> { return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0, hasMore: false } }; }
export async function fetchStores(): Promise<CloudStore[]> { return []; }
export async function createStore(name: string): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function renameStore(id: string, name: string): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function deleteStore(id: string): Promise<void> { throw new Error('Cloud disabled'); }
export async function updateStoreDetails(id: string, data: any): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function checkIdentifierAvailability(q: string): Promise<boolean> { return false; }
export async function updateStoreIdentifier(id: string, identifier: string | null): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function updateStoreVisibility(id: string, isPublic: boolean): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function fetchProvinces(): Promise<any[]> { return []; }
export async function fetchCities(provinceId: number | string): Promise<any[]> { return []; }
export async function fetchDistricts(cityId: number | string): Promise<any[]> { return []; }
export async function uploadStoreLogo(id: string, file: File): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function deleteStoreLogo(id: string): Promise<CloudStore> { throw new Error('Cloud disabled'); }
export async function fetchStoreMembers(storeId: string): Promise<{ members: StoreMember[]; invites: StoreInvite[]; myRole: StoreRole }> { return { members: [], invites: [], myRole: 'OWNER' }; }
export async function inviteStoreMember(storeId: string, input: any): Promise<StoreInvite> { throw new Error('Cloud disabled'); }
export async function acceptStoreInvite(code: string): Promise<any> { throw new Error('Cloud disabled'); }

export interface SyncPayload {
  deviceId: string;
  categories: any[];
  products: any[];
  customers: any[];
  transactions: any[];
  transactionItems: any[];
  expenseCategories: any[];
  expenses: any[];
  debts: any[];
  debtPayments: any[];
  stockOpnames: any[];
  stockOpnameItems: any[];
}

export interface SyncResult {
  message: string;
  rejectedTables?: string[];
}

export async function syncStoreData(storeId: string, payload: SyncPayload): Promise<SyncResult> { throw new Error('Cloud disabled'); }

export interface FetchStoreChangesResult {
  masterTables: string[];
  tables: Record<string, any[]>;
  syncedAt: string | null;
  hasMore: boolean;
  role: string | null;
}

export async function fetchStoreChanges(storeId: string, opts: { since: string | null; deviceId: string }): Promise<FetchStoreChangesResult> { throw new Error('Cloud disabled'); }

export function hasCloudToken(): boolean { return false; }
