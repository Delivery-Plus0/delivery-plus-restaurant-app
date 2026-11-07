import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { BrandColors } from '@/constants/theme';

type AvailabilitySwitchProps = {
  value: boolean;
  onToggle: () => void;
  busy?: boolean;
  accessibilityLabel: string;
  testID?: string;
};

/** On/off switch for an item's availability (Figma R-11): brand red when the item can be ordered. */
export function AvailabilitySwitch({ value, onToggle, busy = false, accessibilityLabel, testID }: AvailabilitySwitchProps) {
  return (
    <Pressable
      testID={testID}
      nativeID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, busy, disabled: busy }}
      accessibilityLabel={accessibilityLabel}
      disabled={busy}
      hitSlop={8}
      onPress={onToggle}
      style={[styles.track, value ? styles.on : styles.off]}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]}>
        {busy ? <ActivityIndicator size="small" color={BrandColors.primary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  on: {
    backgroundColor: BrandColors.primary,
  },
  off: {
    backgroundColor: BrandColors.borderStrong,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BrandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
});
