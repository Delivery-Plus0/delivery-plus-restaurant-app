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
import { setSession } from '@/services/session';
import { describeLoginError } from '@/utils/login-errors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failures, setFailures] = useState(0);
  // State updates land on the next render, so Enter + a tap in quick succession could both pass an
  // `isSubmitting` check and send two sign-in requests. A ref is checked and set synchronously.
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);

  const emailError = !email.trim() ? 'Email is required' : !emailPattern.test(email.trim()) ? 'Enter a valid email' : undefined;
  const passwordError = !password ? 'Password is required' : undefined;
  const show = (field: keyof typeof touched) => submitted || touched[field];

  async function handleSubmit() {
    setSubmitted(true);
    if (emailError || passwordError || inFlight.current) return;

    inFlight.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      const auth = await loginAccount({ email: email.trim(), password });
      await setSession(auth.accessToken);
      router.replace('/home');
    } catch (caught) {
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
      title="Welcome back"
      subtitle="Sign in to continue your order."
      footer={
        <>
          <ThemedText type="small" themeColor="textSecondary">
            New to Delivery Plus?
          </ThemedText>
          <Link href="/register" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <ThemedText type="linkPrimary">Create an account</ThemedText>
            </Pressable>
          </Link>
        </>
      }
    >
      <FormTextInput
        testID="login-email"
        label="Email"
        value={email}
        onChangeText={edit(setEmail, { newAccount: true })}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        error={show('email') ? emailError : undefined}
        placeholder="you@example.com"
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
        label="Password"
        value={password}
        onChangeText={edit(setPassword)}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        error={show('password') ? passwordError : undefined}
        placeholder="Your password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void handleSubmit()}
      />

      {error ? (
        <View style={styles.alert}>
          <InlineAlert message={error} testID="login-error" />
        </View>
      ) : null}

      <AppButton testID="login-submit" title="Sign in" onPress={() => void handleSubmit()} loading={isSubmitting} />

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
  alert: {
    marginBottom: Spacing.three,
  },
  devHint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
