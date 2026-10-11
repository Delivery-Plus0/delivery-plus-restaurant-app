import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { BrandColors, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

type ScreenProps = {
  children: ReactNode;
  /** Tab screens sit above the tab bar, so they only need the top edge. */
  edges?: Edge[];
  /** Pinned below the content (e.g. a checkout CTA); receives the bottom safe-area inset. */
  footer?: ReactNode;
};

export function Screen({ children, edges = ['top'], footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <View style={styles.body}>{children}</View>
      {footer ? (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {footer}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, showBack = false, right }: ScreenHeaderProps) {
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  return (
    <View style={styles.header}>
      {showBack ? <IconButton icon="back" accessibilityLabel={t('Go back')} onPress={goBack} /> : null}
      <View style={styles.headerText}>
        <ThemedText type="subtitle" numberOfLines={1} accessibilityRole="header" testID="screen-title">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  body: {
    flex: 1,
  },
  footer: {
    backgroundColor: BrandColors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.border,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
