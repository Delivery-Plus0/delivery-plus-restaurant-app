import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { BrandColors, Elevation, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ids: `<testID>` and `<testID>-close`. */
  testID?: string;
};

/** From this width a sheet opens as a side panel at the end of the screen (Figma R-04, R-14). */
export const SIDE_PANEL_MIN_WIDTH = 900;

/**
 * Bottom sheet for details that don't need their own page; on wide screens (the restaurant dashboard on a
 * desktop) the same content opens as a side panel. Tapping the backdrop, the close button or the system back
 * button closes it. Part of the shared UI kit (#155): identical in all three apps.
 */
export function Sheet({ visible, title, onClose, children, testID = 'sheet' }: SheetProps) {
  const { width } = useWindowDimensions();
  const side = width >= SIDE_PANEL_MIN_WIDTH;

  return (
    <Modal visible={visible} transparent animationType={side ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.root, side && styles.rootSide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} accessibilityRole="button" />
        <SafeAreaView
          edges={side ? ['top', 'bottom'] : ['bottom']}
          style={[styles.sheet, side && styles.panel]}
          accessibilityViewIsModal
          testID={testID}
          nativeID={testID}
        >
          {side ? null : <View style={styles.grabber} accessibilityElementsHidden importantForAccessibility="no" />}
          <View style={[styles.header, side && styles.headerSide]}>
            <ThemedText type="heading" accessibilityRole="header" style={styles.title} numberOfLines={2}>
              {title}
            </ThemedText>
            <IconButton icon="close" accessibilityLabel={t('Close')} onPress={onClose} testID={`${testID}-close`} />
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
  rootSide: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: BrandColors.surface,
  },
  panel: {
    maxHeight: '100%',
    height: '100%',
    width: 440,
    maxWidth: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    ...Elevation.medium,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.two,
    backgroundColor: BrandColors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four - Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  headerSide: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
  },
  title: {
    flex: 1,
  },
  body: {
    gap: Spacing.three,
    padding: Spacing.four - Spacing.one,
  },
});
