import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Spacing } from '@/constants/theme';
import { LOCALE_NAMES, LOCALES, setLocale, t, useLocale } from '@/i18n';

/** Arabic / English switch (#151). Ids: `language-ar`, `language-en`. */
export function LanguageSwitch() {
  const locale = useLocale();
  const [needsRestart, setNeedsRestart] = useState(false);

  return (
    <View style={styles.root} testID="language-switch" nativeID="language-switch">
      <ThemedText type="caption" themeColor="textSecondary">
        {t('Language')}
      </ThemedText>
      <View style={styles.row}>
        {LOCALES.map((option) => (
          <View key={option} style={styles.option}>
            <AppButton
              testID={`language-${option}`}
              title={LOCALE_NAMES[option]}
              size="sm"
              variant={option === locale ? 'primary' : 'secondary'}
              onPress={() => void setLocale(option).then(setNeedsRestart)}
            />
          </View>
        ))}
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  option: {
    flex: 1,
  },
});
