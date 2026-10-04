import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormShell, emailPattern } from '@/components/auth-form-shell';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import { registerAccount } from '@/services/auth';
import { setSession } from '@/services/session';

type Field = 'fullName' | 'email' | 'password';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Record<Field, boolean>>({ fullName: false, email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Mirrors auth-service RegisterDto.
  const errors: Record<Field, string | undefined> = {
    fullName: fullName.trim() ? undefined : 'Full name is required',
    email: !email.trim() ? 'Email is required' : !emailPattern.test(email.trim()) ? 'Enter a valid email' : undefined,
    password: !password
      ? 'Password is required'
      : password.length < 8
        ? 'Password must be at least 8 characters'
        : undefined,
  };
  const visibleError = (field: Field) => (submitted || touched[field] ? errors[field] : undefined);
  const markTouched = (field: Field) => () => setTouched((current) => ({ ...current, [field]: true }));

  async function handleSubmit() {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const auth = await registerAccount({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'CUSTOMER',
      });
      await setSession(auth.accessToken);
      router.replace('/home');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Create account"
      subtitle="Join Delivery Plus and order your favorites in minutes."
      footer={
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Already have an account?
          </ThemedText>
          <Link href="/login" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <ThemedText type="linkPrimary">Sign in</ThemedText>
            </Pressable>
          </Link>
        </>
      }
    >
      <FormTextInput
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        onBlur={markTouched('fullName')}
        error={visibleError('fullName')}
        placeholder="Jane Customer"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormTextInput
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        onBlur={markTouched('email')}
        error={visibleError('email')}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <FormTextInput
        ref={phoneRef}
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="Optional"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormTextInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        onBlur={markTouched('password')}
        error={visibleError('password')}
        hint="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void handleSubmit()}
      />

      {error ? (
        <View style={styles.alert}>
          <InlineAlert message={error} />
        </View>
      ) : null}

      <AppButton title="Create account" onPress={() => void handleSubmit()} loading={isSubmitting} />
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  alert: {
    marginBottom: Spacing.three,
  },
});
