import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

type DialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Icon above the title (Figma "Dialog"). Destructive dialogs default to the alert icon. */
  icon?: IconName;
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
  cancelLabel = t('Cancel'),
  destructive = false,
  icon,
  onConfirm,
  onCancel,
  testID = 'dialog',
}: DialogProps) {
  const glyph = icon ?? (destructive ? 'error' : undefined);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} accessibilityRole="button" />
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert" testID={testID} nativeID={testID}>
          {glyph ? (
            <View style={[styles.icon, destructive ? styles.iconDanger : styles.iconBrand]}>
              <Icon name={glyph} size={IconSize.lg} color={destructive ? BrandColors.danger : BrandColors.primary} />
            </View>
          ) : null}
          <ThemedText type="heading" accessibilityRole="header">
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <AppButton testID={`${testID}-confirm`} title={confirmLabel} variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} />
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
    maxWidth: 400,
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    backgroundColor: BrandColors.surface,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  iconDanger: {
    backgroundColor: BrandColors.dangerSoft,
  },
  iconBrand: {
    backgroundColor: BrandColors.primarySoft,
  },
  actions: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
