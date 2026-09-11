import { createHmac } from 'crypto';
import { tripayConfig } from '@/config';

interface TripayChannel {
  code: string;
  name: string;
  group: string;
}

export interface TripayCreatePayload {
  method: string;
  merchant_ref: string;
  amount: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_items: {
    name: string;
    price: number;
    quantity: number;
  }[];
  callback_url?: string;
  return_url?: string;
  expired_time?: number;
  signature?: string;
}

export interface TripayCreateResponse {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_selection_type: string;
    payment_method: string;
    payment_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    fee: number;
    amount_received: number;
    pay_code: string;
    checkout_url: string;
    status: string;
    expired_time: number;
    order_items: any[];
  };
}

export interface TripayDetailResponse {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_method: string;
    payment_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    fee: number;
    amount_received: number;
    pay_code: string;
    checkout_url: string;
    status: string;
    expired_time: number;
    order_items: any[];
  };
}

function getBaseUrl(): string {
  return tripayConfig.baseUrl;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${tripayConfig.apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export function generateSignature(merchantRef: string, amount: number): string {
  const msg = `${tripayConfig.merchantCode}${merchantRef}${amount}`;
  return createHmac('sha256', tripayConfig.privateKey).update(msg).digest('hex');
}

export function validateCallbackSignature(jsonBody: string, signature: string): boolean {
  const computed = createHmac('sha256', tripayConfig.privateKey).update(jsonBody).digest('hex');
  return signature === computed;
}

export async function createTransaction(payload: TripayCreatePayload): Promise<TripayCreateResponse> {
  const res = await fetch(`${getBaseUrl()}/transaction/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as TripayCreateResponse;
  if (!res.ok) {
    throw new Error(`Tripay error: ${data.message || res.statusText}`);
  }
  return data;
}

export async function getTransactionDetail(reference: string): Promise<TripayDetailResponse> {
  const res = await fetch(`${getBaseUrl()}/transaction/detail?reference=${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });

  const data = (await res.json()) as TripayDetailResponse;
  if (!res.ok) {
    throw new Error(`Tripay error: ${data.message || res.statusText}`);
  }
  return data;
}

export async function getPaymentChannels(): Promise<TripayChannel[]> {
  const res = await fetch(`${getBaseUrl()}/merchant/payment-channel`, {
    headers: authHeaders(),
  });
  const data = (await res.json()) as { success: boolean; message: string; data: TripayChannel[] };
  if (!res.ok || !data.success) {
    throw new Error(`Tripay error: ${data.message || res.statusText}`);
  }
  return data.data || [];
}
