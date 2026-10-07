import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { BrandColors, Radius, Spacing } from '@/constants/theme';

type DialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Ids: `<testID>`, `<testID>-confirm`, `<testID>-cancel`. */
  testID?: string;
};

/**
 * In-app confirmation dialog. Unlike the native Alert / `window.confirm`, it looks the same on every
 * platform and its buttons can be reached by id (screen readers and E2E flows alike).
 * Tapping the backdrop or the system back button cancels.
 */
export function Dialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  testID = 'dialog',
}: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} accessibilityRole="button" />
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert" testID={testID} nativeID={testID}>
          <ThemedText type="subtitle" accessibilityRole="header">
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <AppButton testID={`${testID}-confirm`} title={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
            <AppButton testID={`${testID}-cancel`} title={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: BrandColors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: BrandColors.surface,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
