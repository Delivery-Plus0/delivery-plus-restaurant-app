import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandColors, Elevation, Radius, Spacing } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

export function Card({ children, style, onPress, accessibilityLabel, testID }: CardProps) {
  if (!onPress) {
    return (
      <View style={[styles.card, style]} testID={testID} nativeID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID} nativeID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BrandColors.divider,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Elevation.low,
  },
  pressed: {
    backgroundColor: BrandColors.surfaceMuted,
  },
});
