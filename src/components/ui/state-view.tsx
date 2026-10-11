import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, Radius, Spacing } from '@/constants/theme';
import { ApiError, NETWORK_ERROR_STATUS } from '@/services/api';
import { t } from '@/i18n';

type StateViewProps = {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
  testID?: string;
};

/** Centered empty / error placeholder used by every data-driven screen. */
export function StateView({ icon, title, message, actionLabel, onAction, tone = 'neutral', testID }: StateViewProps) {
  const danger = tone === 'danger';

  return (
    <View style={styles.container} accessibilityRole="summary" testID={testID} nativeID={testID}>
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Icon name={icon} size={28} color={danger ? BrandColors.danger : BrandColors.primaryText} />
      </View>
      <ThemedText type="heading" style={styles.center}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton title={actionLabel} onPress={onAction} variant={danger ? 'secondary' : 'primary'} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

/** Error state that tells offline failures apart from server errors. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.statusCode === NETWORK_ERROR_STATUS;
  // Server messages are shown in Arabic when the app has a translation for them (#151).
  const message = error instanceof Error ? t(error.message) : t('Something went wrong. Please try again.');

  return (
    <StateView
      testID="error-state"
      icon={offline ? 'offline' : 'error'}
      tone="danger"
      title={offline ? t('You appear to be offline') : t('Something went wrong')}
      message={message}
      actionLabel={onRetry ? t('Try again') : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  iconWrapDanger: {
    backgroundColor: BrandColors.dangerSoft,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.three,
  },
});
