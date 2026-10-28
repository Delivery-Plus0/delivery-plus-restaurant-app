import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormShell, emailPattern } from '@/components/auth-form-shell';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { API_BASE_URL } from '@/config/api';
import { Spacing } from '@/constants/theme';
import { loginAccount } from '@/services/auth';
import { signOut } from '@/services/api';
import { setSession } from '@/services/session';
import { isEmailNotVerified, startEmailVerification, takeVerifiedEmail } from '@/utils/email-verification';
import { describeLoginError } from '@/utils/login-errors';
import { OWNER_ROLE } from '@/utils/order-status';
import { takePasswordResetNotice } from '@/utils/password';
import { t } from '@/i18n';

export default function LoginScreen() {
  // Coming back from the code screen: the email is filled in and the person is told it worked.
  const [verifiedEmail] = useState(takeVerifiedEmail);
  // Coming back from a password reset (#35): every session ended, so the person signs in again.
  const [passwordReset] = useState(takePasswordResetNotice);
  const [email, setEmail] = useState(verifiedEmail ?? '');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    verifiedEmail
      ? t('Email verified. Sign in to continue.')
      : passwordReset
        ? t('Password changed. Sign in with your new password.')
        : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failures, setFailures] = useState(0);
  // State updates land on the next render, so Enter + a tap in quick succession could both pass an
  // `isSubmitting` check and send two sign-in requests. A ref is checked and set synchronously.
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);

  const emailError = !email.trim() ? t('Email is required') : !emailPattern.test(email.trim()) ? t('Enter a valid email') : undefined;
  const passwordError = !password ? t('Password is required') : undefined;
  const show = (field: keyof typeof touched) => submitted || touched[field];

  async function handleSubmit() {
    setSubmitted(true);
    if (emailError || passwordError || inFlight.current) return;

    inFlight.current = true;
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const auth = await loginAccount({ email: email.trim(), password });
      if (auth.role !== OWNER_ROLE) {
        // The credentials are valid but this app is for restaurant owners only; don't keep the session.
        void signOut(auth.refreshToken);
        setError(t('This app is for restaurant owners. Sign in with an owner account, or use the Delivery Plus customer or driver app.'));
        return;
      }
      await setSession(auth.accessToken, auth.refreshToken);
      router.replace('/home');
    } catch (caught) {
      // #252: the password was right, but the email still needs its code.
      if (isEmailNotVerified(caught)) {
        startEmailVerification(email.trim(), null);
        // replace, not push: one sign-in screen at a time (the code screen comes back to a fresh one).
        router.replace('/verify-email');
        return;
      }
      const consecutiveFailures = failures + 1;
      setFailures(consecutiveFailures);
      setError(describeLoginError(caught, consecutiveFailures));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  /** Editing a field makes the previous error stale. Lockout is per account, so a new email restarts the count. */
  function edit(setter: (value: string) => void, { newAccount = false } = {}) {
    return (value: string) => {
      setter(value);
      setError(null);
      if (newAccount) setFailures(0);
    };
  }

  return (
    <AuthFormShell
      title={t('Restaurant sign in')}
      subtitle={t('Open your kitchen order desk.')}
      footer={
        <ThemedText type="small" themeColor="textSecondary">
          {t('Restaurant owner accounts are provisioned by your administrator.')}
        </ThemedText>
      }
    >
      <FormTextInput
        testID="login-email"
        label={t('Email')}
        value={email}
        onChangeText={edit(setEmail, { newAccount: true })}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        error={show('email') ? emailError : undefined}
        placeholder={t('you@example.com')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormTextInput
        testID="login-password"
        ref={passwordRef}
        label={t('Password')}
        value={password}
        onChangeText={edit(setPassword)}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        error={show('password') ? passwordError : undefined}
        placeholder={t('Your password')}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void handleSubmit()}
      />
      <View style={styles.forgot}>
        <Link href="/forgot-password" replace asChild>
          <Pressable accessibilityRole="link" hitSlop={8} testID="login-forgot" nativeID="login-forgot">
            <ThemedText type="linkPrimary">{t('Forgot password?')}</ThemedText>
          </Pressable>
        </Link>
      </View>

      {notice ? (
        <View style={styles.alert}>
          <InlineAlert message={notice} tone="success" testID="login-notice" />
        </View>
      ) : null}
      {error ? (
        <View style={styles.alert}>
          <InlineAlert message={error} testID="login-error" />
        </View>
      ) : null}

      <AppButton testID="login-submit" title={t('Sign in')} onPress={() => void handleSubmit()} loading={isSubmitting} />

      {__DEV__ ? (
        // Development builds only: the dev (:3000) and E2E (:3100) backends have different accounts.
        <ThemedText type="small" themeColor="textSecondary" style={styles.devHint} testID="login-api-hint">
          API: {API_BASE_URL}
        </ThemedText>
      ) : null}
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
  },
  alert: {
    marginBottom: Spacing.three,
  },
  devHint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
