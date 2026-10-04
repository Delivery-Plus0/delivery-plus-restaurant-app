import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';

const FEATURES: { icon: IconName; title: string; subtitle: string }[] = [
  { icon: 'store', title: 'Local favorites', subtitle: 'Browse restaurants and full menus' },
  { icon: 'bag', title: 'Quick checkout', subtitle: 'Build your cart and pay in seconds' },
  { icon: 'delivery', title: 'Follow every step', subtitle: 'Live order status from kitchen to door' },
];

export default function WelcomeScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Delivery Plus"
          />
          <ThemedText type="title" style={styles.center} accessibilityRole="header">
            Fast meals, delivered your way.
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
            Discover local favorites, build your cart in seconds, and track your order from kitchen to door.
          </ThemedText>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} size={IconSize.md} color={BrandColors.primaryText} />
              </View>
              <View style={styles.featureText}>
                <ThemedText type="smallBold">{feature.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feature.subtitle}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <AppButton title="Get started" onPress={() => router.push('/register')} />
          <AppButton title="I already have an account" variant="secondary" onPress={() => router.push('/login')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.three,
  },
  logo: {
    width: 220,
    height: 64,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  features: {
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  actions: {
    gap: Spacing.three,
  },
});
