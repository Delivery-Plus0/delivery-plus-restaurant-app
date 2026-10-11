import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Sheet } from '@/components/ui/sheet';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import type { RestaurantOrder } from '@/services/restaurant-orders';
import { rejectOrder, useOrderDriver } from '@/state/restaurant';
import { formatDateTime, formatMoney, shortId } from '@/utils/format';
import { canReject, dropOffArea, ORDER_STATUS_META, REJECT_REASON_MAX, rejectReasons } from '@/utils/order-status';
import { t } from '@/i18n';

type OrderDetailSheetProps = {
  restaurantId: string;
  /** The order to show; null keeps the sheet closed. */
  order: RestaurantOrder | null;
  onClose: () => void;
  /** Called after a rejection went through, with a message for the board. */
  onRejected: (message: string) => void;
};

/** Everything the kitchen needs about one order (#154), and rejecting it before preparing. */
export function OrderDetailSheet({ restaurantId, order, onClose, onRejected }: OrderDetailSheetProps) {
  return (
    <Sheet visible={order !== null} title={order ? `Order ${shortId(order.id)}` : 'Order'} onClose={onClose} testID="order-sheet">
      {/* Keyed by order so switching orders starts the reject form fresh. */}
      {order ? <OrderDetail key={order.id} restaurantId={restaurantId} order={order} onRejected={onRejected} /> : null}
    </Sheet>
  );
}

function OrderDetail({ restaurantId, order, onRejected }: { restaurantId: string; order: RestaurantOrder; onRejected: (message: string) => void }) {
  const status = ORDER_STATUS_META[order.status];
  const area = dropOffArea(order.deliveryAddress);
  const driver = useOrderDriver(order.id);
  const [rejecting, setRejecting] = useState(false);

  // The form replaces the details, so it is never below the fold of a short sheet.
  if (rejecting && canReject(order.status)) {
    return <RejectForm restaurantId={restaurantId} order={order} onRejected={onRejected} onCancel={() => setRejecting(false)} />;
  }

  return (
    <View style={styles.body}>
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {formatDateTime(order.createdAt)}
        </ThemedText>
        <Badge label={status.label} tone={status.tone} testID="order-sheet-status" />
      </View>

      <Section title={t('Customer')}>
        <ThemedText type="default" testID="order-sheet-customer">
          {order.customerFirstName || t('Customer')}
        </ThemedText>
      </Section>

      <Section title={t('Items')}>
        {order.items.map((item, index) => (
          <View key={`${item.menuItemId}-${index}`} style={styles.row}>
            <ThemedText type="small" style={styles.quantity}>
              {item.quantity}×
            </ThemedText>
            <ThemedText type="small" style={styles.flex}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.price}>
              {formatMoney(Number(item.price) * item.quantity)}
            </ThemedText>
          </View>
        ))}
        <View style={styles.row}>
          <ThemedText type="smallBold" style={styles.flex}>
            {t('Items total')}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.price} testID="order-sheet-total">
            {formatMoney(order.subtotalAmount ?? order.totalAmount)}
          </ThemedText>
        </View>
      </Section>

      <Section title={t('Customer notes')}>
        <ThemedText type="small" themeColor={order.deliveryNotes ? 'text' : 'textSecondary'} testID="order-sheet-notes">
          {order.deliveryNotes || t('No notes')}
        </ThemedText>
      </Section>

      {area ? (
        <Section title={t('Drop-off area')}>
          <ThemedText type="small" testID="order-sheet-area">
            {area}
          </ThemedText>
        </Section>
      ) : null}

      <Section title={t('Driver')}>
        <ThemedText type="small" themeColor={driver.data ? 'text' : 'textSecondary'} testID="order-sheet-driver">
          {driver.data
            ? [driver.data.displayName, driver.data.vehicleType, driver.data.licensePlate].filter(Boolean).join(' · ')
            : driver.isLoading
              ? t('Checking…')
              : t('No driver assigned yet')}
        </ThemedText>
      </Section>

      {canReject(order.status) ? (
        <AppButton testID="order-sheet-reject" title={t('Reject order')} icon="close" variant="danger" size="sm" onPress={() => setRejecting(true)} />
      ) : null}
    </View>
  );
}

function RejectForm({
  restaurantId,
  order,
  onRejected,
  onCancel,
}: {
  restaurantId: string;
  order: RestaurantOrder;
  onRejected: (message: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const trimmed = reason.trim();

  async function submit() {
    if (inFlight.current) return;
    if (!trimmed) {
      setError(t('Tell the customer why: pick a reason or write one.'));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await rejectOrder(restaurantId, order.id, trimmed);
      onRejected(t('Order {id} rejected. The customer has been told why.', { id: shortId(order.id) }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('That did not go through. Check your connection and try again.'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.reject} testID="reject-form" nativeID="reject-form">
      <ThemedText type="smallBold">{t('Why are you rejecting this order?')}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {t('The customer sees this reason. You can only reject an order before you start preparing it.')}
      </ThemedText>
      <View style={styles.reasons}>
        {rejectReasons().map((preset, index) => (
          <AppButton
            key={preset}
            testID={`reject-reason-${index}`}
            title={preset}
            variant={trimmed === preset ? 'primary' : 'secondary'}
            size="sm"
            fullWidth={false}
            onPress={() => setReason(preset)}
          />
        ))}
      </View>
      <FormTextInput
        testID="reject-reason-input"
        label={t('Reason')}
        value={reason}
        onChangeText={setReason}
        maxLength={REJECT_REASON_MAX}
        placeholder={t('For example: we ran out of an item')}
      />
      {error ? <InlineAlert message={error} testID="reject-error" /> : null}
      <AppButton testID="reject-confirm" title={t('Reject and tell the customer')} variant="danger" size="sm" loading={busy} onPress={() => void submit()} />
      <AppButton testID="reject-cancel" title={t('Keep the order')} variant="ghost" size="sm" disabled={busy} onPress={onCancel} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  quantity: {
    width: 28,
    fontVariant: ['tabular-nums'],
  },
  price: {
    fontVariant: ['tabular-nums'],
  },
  reject: {
    gap: Spacing.two,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
