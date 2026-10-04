import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPost } from './api';
import { createPayment, fetchPayment, processPayment } from './payments';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('payment service gateway mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a payment with the order id and retry key using authenticated gateway access', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'payment-1' });

    await createPayment('order-1', 'payment-key-1');

    expect(apiPost).toHaveBeenCalledWith(
      '/api/payments',
      { orderId: 'order-1' },
      true,
      { 'Idempotency-Key': 'payment-key-1' },
    );
  });

  it('processes and fetches a payment through the public gateway routes', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'payment-1', status: 'COMPLETED' });
    vi.mocked(apiGet).mockResolvedValue({ id: 'payment-1', status: 'COMPLETED' });

    await processPayment('payment-1');
    await fetchPayment('payment-1');

    expect(apiPost).toHaveBeenCalledWith('/api/payments/payment-1/process', {}, true);
    expect(apiGet).toHaveBeenCalledWith('/api/payments/payment-1', true);
  });
});