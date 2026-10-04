import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrder } from './orders';
import { createPayment, processPayment } from './payments';
import { submitCheckout } from './checkout';

vi.mock('./orders', () => ({ createOrder: vi.fn() }));
vi.mock('./payments', () => ({
  createPayment: vi.fn(),
  processPayment: vi.fn(),
}));

describe('submitCheckout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the order, creates its payment, and processes it in sequence', async () => {
    const order = { id: 'order-1' } as Awaited<ReturnType<typeof createOrder>>;
    const pendingPayment = { id: 'payment-1' } as Awaited<ReturnType<typeof createPayment>>;
    const completedPayment = { id: 'payment-1', status: 'COMPLETED' } as Awaited<ReturnType<typeof processPayment>>;
    vi.mocked(createOrder).mockResolvedValue(order);
    vi.mocked(createPayment).mockResolvedValue(pendingPayment);
    vi.mocked(processPayment).mockResolvedValue(completedPayment);

    const result = await submitCheckout('order-key', 'payment-key');

    expect(createOrder).toHaveBeenCalledWith('order-key');
    expect(createPayment).toHaveBeenCalledWith('order-1', 'payment-key');
    expect(processPayment).toHaveBeenCalledWith('payment-1');
    expect(result).toEqual({ order, payment: completedPayment });
  });

  it('returns a failed payment with its order for the screen to show status', async () => {
    const order = { id: 'order-1' } as Awaited<ReturnType<typeof createOrder>>;
    const pendingPayment = { id: 'payment-1' } as Awaited<ReturnType<typeof createPayment>>;
    const failedPayment = {
      id: 'payment-1',
      status: 'FAILED',
      failureReason: 'Card declined',
    } as Awaited<ReturnType<typeof processPayment>>;
    vi.mocked(createOrder).mockResolvedValue(order);
    vi.mocked(createPayment).mockResolvedValue(pendingPayment);
    vi.mocked(processPayment).mockResolvedValue(failedPayment);

    await expect(submitCheckout('order-key', 'payment-key')).resolves.toEqual({
      order,
      payment: failedPayment,
    });
  });
});