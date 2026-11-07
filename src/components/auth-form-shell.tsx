import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { BrandColors, IconSize, Layout, Spacing } from '@/constants/theme';
import { LOCALE_NAMES, setLocale, t, useLocale } from '@/i18n';

type AuthFormShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** A brand panel shown beside the form on wide screens (the restaurant dashboard's desktop sign-in). */
  aside?: ReactNode;
};

/** Wide enough for the brand panel beside the form. */
export const AUTH_SPLIT_MIN_WIDTH = 960;

/**
 * Shared layout for the auth screens (Redesign 2026, Figma C-02/C-03, D-02, R-01): a top bar with back and the
 * language toggle, the logo mark, a start-aligned title and the form, with no card around it.
 */
export function AuthFormShell({ title, subtitle, children, footer, aside }: AuthFormShellProps) {
  const { width } = useWindowDimensions();
  const split = Boolean(aside) && width >= AUTH_SPLIT_MIN_WIDTH;

  const form = (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        {router.canGoBack() ? (
          <IconButton icon="back" variant="plain" accessibilityLabel={t('Go back')} onPress={() => router.back()} testID="auth-back" />
        ) : (
          <View style={styles.topBarSpacer} />
        )}
        <AuthLanguageToggle />
      </View>
      <ScrollView contentContainerStyle={[styles.content, split && styles.contentSplit]} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {split ? null : (
            <Image
              source={require('@/assets/logo-mark.png')}
              style={styles.mark}
              resizeMode="contain"
              accessibilityLabel={t('Delivery Plus')}
            />
          )}
          <View style={styles.heading}>
            <ThemedText type={split ? 'subtitle' : 'title'} accessibilityRole="header">
              {title}
            </ThemedText>
            <ThemedText type={split ? 'small' : 'default'} themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          </View>
          {children}
          <View style={styles.footer}>{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      {split ? (
        <View style={styles.split}>
          <View style={styles.aside}>{aside}</View>
          <View style={styles.flex}>{form}</View>
        </View>
      ) : (
        form
      )}
    </Screen>
  );
}

/** Switches to the other language. Ids: `auth-language`. */
export function AuthLanguageToggle() {
  const locale = useLocale();
  const other = locale === 'ar' ? 'en' : 'ar';
  return (
    <Pressable
      testID="auth-language"
      nativeID="auth-language"
      accessibilityRole="button"
      accessibilityLabel={`${t('Language')}: ${LOCALE_NAMES[other]}`}
      hitSlop={8}
      onPress={() => void setLocale(other)}
      style={({ pressed }) => [styles.language, pressed && styles.languagePressed]}
    >
      <Icon name="language" size={IconSize.sm + 2} color={BrandColors.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {LOCALE_NAMES[other]}
      </ThemedText>
    </Pressable>
  );
}

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  aside: {
    width: '40%',
    maxWidth: 600,
    backgroundColor: BrandColors.tanSoft,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    minHeight: Layout.minTouch + Spacing.two,
  },
  topBarSpacer: {
    width: Layout.minTouch,
  },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.two + Spacing.half,
    borderRadius: 999,
  },
  languagePressed: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four - Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  contentSplit: {
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  mark: {
    width: 56,
    height: 59,
    marginBottom: Spacing.four,
  },
  heading: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },
});
