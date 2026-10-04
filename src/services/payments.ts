import { apiGet, apiPost } from '@/services/api';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;

export type Payment = {
  id: string;
  orderId: string;
  customerId: string;
  amount: string | number;
  status: PaymentStatus;
  failureReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function createPayment(orderId: string, idempotencyKey?: string): Promise<Payment> {
  return apiPost<Payment>(
    '/api/payments',
    { orderId },
    true,
    idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  );
}

export async function processPayment(paymentId: string): Promise<Payment> {
  return apiPost<Payment>(`/api/payments/${paymentId}/process`, {}, true);
}

export async function fetchPayment(paymentId: string): Promise<Payment> {
  return apiGet<Payment>(`/api/payments/${paymentId}`, true);
}