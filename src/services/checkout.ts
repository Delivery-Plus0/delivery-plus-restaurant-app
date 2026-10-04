import { createOrder, type Order } from '@/services/orders';
import { createPayment, processPayment, type Payment } from '@/services/payments';

export type CheckoutResult = {
  order: Order;
  payment: Payment;
};

export async function submitCheckout(
  orderIdempotencyKey: string,
  paymentIdempotencyKey: string,
): Promise<CheckoutResult> {
  const order = await createOrder(orderIdempotencyKey);
  const pendingPayment = await createPayment(order.id, paymentIdempotencyKey);
  const payment = await processPayment(pendingPayment.id);

  return { order, payment };
}