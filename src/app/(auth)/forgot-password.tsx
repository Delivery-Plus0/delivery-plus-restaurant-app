import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormShell } from '@/components/auth-form-shell';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spacing } from '@/constants/theme';
import { requestPasswordReset, resetPassword } from '@/services/password';
import {
  type ResetAttempts,
  cleanResetCode,
  confirmPasswordError,
  describeForgotRefusal,
  describeResetRefusal,
  finishPasswordReset,
  isCompleteResetCode,
  newPasswordError,
  resetResendWaitSeconds,
} from '@/utils/password';
import { EGYPTIAN_MOBILE_MESSAGE, PHONE_HINT, formatPhone, normalizeEgyptianMobile } from '@/utils/phone';
import { t } from '@/i18n';

/**
 * Shared kit (backend #35): reset a forgotten password with a code texted to the account's verified
 * phone. Step 1 asks for the phone, step 2 for the code and the new password; then sign-in says it
 * worked. The server answers the same whether or not the number has an account, and so does this screen.
 */
export default function ForgotPasswordScreen() {
  const [phoneInput, setPhoneInput] = useState('');
  /** The E.164 number a code was requested for; null while on step 1. */
  const [phone, setPhone] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ResetAttempts>({ sentAt: 0, wrongCodes: 0 });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<'send' | 'reset' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const resendIn = phone ? resetResendWaitSeconds(attempts.sentAt, now) : 0;
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  async function run(kind: 'send' | 'reset', action: () => Promise<void>) {
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

  const send = (target: string, resending: boolean) =>
    run('send', async () => {
      const requestedAt = Date.now();
      try {
        await requestPasswordReset(target);
      } catch (caught) {
        const refusal = describeForgotRefusal(caught);
        setUnavailable(refusal.unavailable);
        setError(refusal.message);
        return;
      }
      setPhone(target);
      setAttempts({ sentAt: requestedAt, wrongCodes: 0 });
      setNeedsNewCode(false);
      setCode('');
      setNow(requestedAt);
      if (resending) setNotice(t('We sent a new code to {phone}.', { phone: formatPhone(target) }));
    });

  const sendFirst = () => {
    const target = normalizeEgyptianMobile(phoneInput);
    if (!target) {
      setError(t(EGYPTIAN_MOBILE_MESSAGE));
      return;
    }
    void send(target, false);
  };

  const passwordError = newPasswordError(password);
  const confirmError = confirmPasswordError(password, confirmation);

  const reset = () =>
    run('reset', async () => {
      setSubmitted(true);
      if (!phone) return;
      if (!isCompleteResetCode(code)) {
        setError(t('Enter the 6 digits from the text message.'));
        return;
      }
      if (passwordError || confirmError) return;
      try {
        await resetPassword(phone, cleanResetCode(code), password);
        finishPasswordReset();
        router.replace('/login');
      } catch (caught) {
        const refusal = describeResetRefusal(caught, attempts);
        setAttempts((current) => ({ ...current, wrongCodes: refusal.wrongCodes }));
        setNeedsNewCode(refusal.needsNewCode);
        setError(refusal.message);
      }
    });

  const footer = (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.replace('/login')} testID="forgot-back" nativeID="forgot-back">
      <ThemedText type="linkPrimary">{t('Back to sign in')}</ThemedText>
    </Pressable>
  );

  if (!phone) {
    return (
      <AuthFormShell
        title={t('Forgot your password?')}
        subtitle={t("Enter your account's phone number. We'll text you a code to set a new password.")}
        footer={footer}
      >
        <View style={styles.form} testID="forgot-screen" nativeID="forgot-screen">
          <FormTextInput
            testID="forgot-phone"
            label={t('Phone')}
            value={phoneInput}
            onChangeText={(value) => {
              setPhoneInput(value);
              setError(null);
            }}
            hint={t(PHONE_HINT)}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="send"
            onSubmitEditing={sendFirst}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('Only a phone number you verified in the app can get the code.')}
          </ThemedText>
          {error ? <InlineAlert message={error} tone={unavailable ? 'info' : 'danger'} testID="forgot-error" /> : null}
          <AppButton testID="forgot-send" title={t('Send code')} loading={busy === 'send'} disabled={busy !== null} onPress={sendFirst} />
        </View>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell title={t('Set a new password')} subtitle={t('Enter the code and choose a new password.')} footer={footer}>
      <View style={styles.form} testID="forgot-reset-screen" nativeID="forgot-reset-screen">
        <ThemedText type="small" themeColor="textSecondary" testID="forgot-sent" nativeID="forgot-sent">
          {t('If {phone} is the verified phone of an account, we texted it a 6-digit code. It works for 5 minutes.', {
            phone: formatPhone(phone),
          })}
        </ThemedText>
        <FormTextInput
          testID="forgot-code"
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <FormTextInput
          testID="forgot-new-password"
          ref={passwordRef}
          label={t('New password')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          error={submitted ? passwordError : undefined}
          hint={t('At least 8 characters')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <FormTextInput
          testID="forgot-confirm-password"
          ref={confirmRef}
          label={t('Confirm new password')}
          value={confirmation}
          onChangeText={(value) => {
            setConfirmation(value);
            setError(null);
          }}
          error={submitted ? confirmError : undefined}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void reset()}
        />
        {error ? <InlineAlert message={error} testID="forgot-error" /> : null}
        {notice ? <InlineAlert message={notice} tone="info" testID="forgot-notice" /> : null}
        <AppButton
          testID="forgot-submit"
          title={t('Reset password')}
          loading={busy === 'reset'}
          disabled={needsNewCode || busy !== null}
          onPress={() => void reset()}
        />
        <AppButton
          testID="forgot-resend"
          title={resendIn > 0 ? t('Resend code in {seconds} s', { seconds: resendIn }) : t('Resend code')}
          variant="ghost"
          loading={busy === 'send'}
          disabled={busy !== null || resendIn > 0}
          onPress={() => void send(phone, true)}
        />
        <AppButton
          testID="forgot-change-phone"
          title={t('Use a different number')}
          variant="ghost"
          disabled={busy !== null}
          onPress={() => {
            setPhone(null);
            setError(null);
            setNotice(null);
            setCode('');
          }}
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
