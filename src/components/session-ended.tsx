import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { StateView } from '@/components/ui/state-view';
import { BrandColors } from '@/constants/theme';
import { t } from '@/i18n';
import { acknowledgeSessionEnded, type SessionEnded } from '@/services/session';

/**
 * Says why the app signed the person out when they didn't do it themselves (#34, #202): the session
 * couldn't be refreshed, or the account is suspended. Covers every screen until acknowledged, then the
 * signed-out screens show. Rendered over the router by the root layout, so navigation stays mounted.
 */
export function SessionEndedScreen({ reason }: { reason: Exclude<SessionEnded, null> }) {
  const suspended = reason === 'suspended';

  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]} accessibilityViewIsModal>
      <Screen edges={['top', 'bottom']}>
        {suspended ? (
          <StateView
            testID="account-suspended"
            icon="error"
            tone="danger"
            title={t('Your account is suspended')}
            message={t("You can't use Delivery Plus with this account right now. If you think this is a mistake, contact Delivery Plus support.")}
            actionLabel={t('OK')}
            onAction={acknowledgeSessionEnded}
          />
        ) : (
          <StateView
            testID="session-ended"
            icon="logout"
            title={t('You have been signed out')}
            message={t('Your session ended. Sign in again to continue.')}
            actionLabel={t('Sign in')}
            onAction={acknowledgeSessionEnded}
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: BrandColors.background,
  },
});
