import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BrandColors, Radius, Spacing } from '@/constants/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pulsing placeholder block; runs on the UI thread and respects reduced motion. */
export function Skeleton({ width = '100%', height = 14, radius = Radius.sm, style }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}

/** A list of card-shaped skeletons for list screens while the first page loads. */
export function SkeletonList({ count = 4, itemHeight = 88 }: { count?: number; itemHeight?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <Skeleton width={itemHeight - Spacing.four} height={itemHeight - Spacing.four} radius={Radius.sm} />
          <View style={styles.cardLines}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="45%" />
            <Skeleton width="30%" />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: BrandColors.divider,
  },
  list: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.divider,
  },
  cardLines: {
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
  },
});
