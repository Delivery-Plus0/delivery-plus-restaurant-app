import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthFormShell } from '@/components/auth-form-shell';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spacing } from '@/constants/theme';
import { resendEmailCode, verifyEmailCode } from '@/services/email-verification';
import {
  type CodeAttempts,
  cleanEmailCode,
  describeCodeRefusal,
  describeResendRefusal,
  finishEmailVerification,
  isCompleteEmailCode,
  pendingEmailVerification,
  resendWaitSeconds,
} from '@/utils/email-verification';
import { t } from '@/i18n';

/**
 * Shared kit (backend #203, #252): enter the 6-digit code emailed at sign-up, or ask for a new one.
 * Reached after sign-up or a sign-in refused with 403 EmailNotVerified; the email comes from
 * `startEmailVerification`, never from the URL. A verified email goes to sign-in, filled in.
 */
export default function VerifyEmailScreen() {
  const [pending] = useState(pendingEmailVerification);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState<CodeAttempts>({ sentAt: pending?.sentAt ?? null, wrongCodes: 0 });
  const [needsNewCode, setNeedsNewCode] = useState(false);
  // The resend countdown starts from the last send the app knows about (sign-up, or a resend).
  const [lastRequestAt, setLastRequestAt] = useState<number | null>(pending?.sentAt ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const resendIn = resendWaitSeconds(lastRequestAt, now);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  if (!pending) {
    // Opened directly, or the page was reloaded: the email was only ever kept in memory.
    return (
      <AuthFormShell title={t('Verify your email')} subtitle={t('Sign in again to get to your code.')} footer={null}>
        <AppButton testID="verify-email-restart" title={t('Sign in')} onPress={() => router.replace('/login')} />
      </AuthFormShell>
    );
  }
  const { email } = pending;

  async function run(kind: 'verify' | 'resend', action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const verify = () =>
    run('verify', async () => {
      if (!isCompleteEmailCode(code)) {
        setError(t('Enter the 6 digits from the email.'));
        return;
      }
      try {
        await verifyEmailCode(email, cleanEmailCode(code));
        finishEmailVerification();
        router.replace('/login');
      } catch (caught) {
        const refusal = describeCodeRefusal(caught, attempts);
        setAttempts((current) => ({ ...current, wrongCodes: refusal.wrongCodes }));
        setNeedsNewCode(refusal.needsNewCode);
        setError(refusal.message);
      }
    });

  const resend = () =>
    run('resend', async () => {
      const requestedAt = Date.now();
      try {
        await resendEmailCode(email);
        setAttempts({ sentAt: requestedAt, wrongCodes: 0 });
        setNeedsNewCode(false);
        setCode('');
        setNotice(t('We sent a new code to {email}.', { email }));
      } catch (caught) {
        const refusal = describeResendRefusal(caught);
        setError(refusal.message);
        if (!refusal.restartCooldown) return;
      }
      setLastRequestAt(requestedAt);
      setNow(requestedAt);
    });

  return (
    <AuthFormShell
      title={t('Verify your email')}
      subtitle={t('Enter the 6-digit code we sent to {email}.', { email })}
      footer={
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.replace('/login')} testID="verify-email-back" nativeID="verify-email-back">
          <ThemedText type="linkPrimary">{t('Back to sign in')}</ThemedText>
        </Pressable>
      }
    >
      <View style={styles.form} testID="verify-email-screen" nativeID="verify-email-screen">
        {attempts.sentAt !== null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('The code works for 10 minutes.')}
          </ThemedText>
        ) : null}
        <FormTextInput
          testID="verify-email-code"
          label={t('Code')}
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setError(null);
          }}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
          returnKeyType="go"
          onSubmitEditing={() => void verify()}
        />
        {error ? <InlineAlert message={error} testID="verify-email-error" /> : null}
        {notice ? <InlineAlert message={notice} tone="info" testID="verify-email-notice" /> : null}
        <AppButton
          testID="verify-email-submit"
          title={t('Verify')}
          loading={busy === 'verify'}
          disabled={needsNewCode || busy !== null}
          onPress={() => void verify()}
        />
        <AppButton
          testID="verify-email-resend"
          title={resendIn > 0 ? t('Resend code in {seconds} s', { seconds: resendIn }) : t('Resend code')}
          variant="ghost"
          loading={busy === 'resend'}
          disabled={busy !== null || resendIn > 0}
          onPress={() => void resend()}
        />
      </View>
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
});
