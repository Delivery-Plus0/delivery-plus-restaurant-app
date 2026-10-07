import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { BrandColors, Radius, Spacing } from '@/constants/theme';

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ids: `<testID>` and `<testID>-close`. */
  testID?: string;
};

/**
 * Bottom sheet for details that don't need their own page. Tapping the backdrop, the close button or
 * the system back button closes it. Part of the shared UI kit (#155): identical in all three apps.
 */
export function Sheet({ visible, title, onClose, children, testID = 'sheet' }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal testID={testID} nativeID={testID}>
          <View style={styles.header}>
            <ThemedText type="subtitle" accessibilityRole="header" style={styles.title} numberOfLines={2}>
              {title}
            </ThemedText>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} testID={`${testID}-close`} />
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BrandColors.overlay,
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: BrandColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  title: {
    flex: 1,
  },
  body: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
