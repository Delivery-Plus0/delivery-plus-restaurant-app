import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { toastDurationMs, type ToastTone } from '@/utils/toast';

type ToastProps = {
  /** The message to show; null hides the toast. */
  message: string | null;
  tone?: ToastTone;
  onHide: () => void;
  testID?: string;
};

/**
 * A short, non-blocking confirmation at the bottom of the screen ("Order moved to In kitchen"). It hides
 * itself after a reading-time delay, can be tapped away, and is announced to screen readers. For
 * something the user must act on, use an inline alert, a dialog or a sheet instead (see docs/ui-kit.md).
 */
export function Toast({ message, tone = 'success', onHide, testID = 'toast' }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onHide, toastDurationMs(message));
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;
  const style = TONES[tone];

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <Pressable
        onPress={onHide}
        style={[styles.toast, { backgroundColor: style.background }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tap to dismiss"
        testID={testID}
        nativeID={testID}>
        <Icon name={style.icon} size={IconSize.sm} color={style.text} />
        <ThemedText type="smallBold" style={[styles.text, { color: style.text }]}>
          {message}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const TONES = {
  success: { background: BrandColors.text, text: BrandColors.surface, icon: 'check' },
  info: { background: BrandColors.text, text: BrandColors.surface, icon: 'bell' },
  danger: { background: BrandColors.danger, text: BrandColors.surface, icon: 'error' },
} as const;

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: Spacing.four,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 560,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  text: {
    flexShrink: 1,
  },
});
