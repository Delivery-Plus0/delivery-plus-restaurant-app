import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { BrandColors, Elevation, Radius, Spacing } from '@/constants/theme';

type AuthFormShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

/** Shared layout for login/register: logo, card with the form, and a footer link. */
export function AuthFormShell({ title, subtitle, children, footer }: AuthFormShellProps) {
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Delivery Plus"
          />
          <View style={styles.card}>
            <ThemedText type="subtitle" accessibilityRole="header">
              {title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
            {children}
          </View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  logo: {
    width: 200,
    height: 56,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    backgroundColor: BrandColors.surface,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: BrandColors.divider,
    ...Elevation.medium,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
