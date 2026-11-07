import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Elevation, Radius, Spacing } from '@/constants/theme';
import { LOCALE_NAMES, LOCALES, setLocale, t, useLocale } from '@/i18n';

/**
 * Arabic / English switch (#151), drawn as the Figma segmented control (Redesign 2026).
 * Ids: `language-ar`, `language-en`.
 */
export function LanguageSwitch() {
  const locale = useLocale();
  const [needsRestart, setNeedsRestart] = useState(false);

  return (
    <View style={styles.root} testID="language-switch" nativeID="language-switch">
      <ThemedText type="caption" themeColor="textSecondary">
        {t('Language')}
      </ThemedText>
      <View style={styles.track} accessibilityRole="radiogroup">
        {LOCALES.map((option) => {
          const selected = option === locale;
          return (
            <Pressable
              key={option}
              testID={`language-${option}`}
              nativeID={`language-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={LOCALE_NAMES[option]}
              onPress={() => void setLocale(option).then(setNeedsRestart)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                {LOCALE_NAMES[option]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {needsRestart ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {t('Restart the app to finish switching the layout direction.')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  track: {
    flexDirection: 'row',
    padding: Spacing.one,
    gap: Spacing.one,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.divider,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: Radius.sm - Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: BrandColors.surface,
    ...Elevation.low,
  },
});
