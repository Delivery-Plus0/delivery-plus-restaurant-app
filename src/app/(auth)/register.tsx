import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthFormShell, emailPattern } from '@/components/auth-form-shell';
import { RestaurantBrandPanel } from '@/components/restaurant-brand-panel';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import { registerAccount } from '@/services/auth';
import { setSession } from '@/services/session';
import { startEmailVerification } from '@/utils/email-verification';
import { PHONE_HINT, normalizeEgyptianMobile, phoneError } from '@/utils/phone';
import { t } from '@/i18n';

type Field = 'fullName' | 'email' | 'phone' | 'password';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Record<Field, boolean>>({ fullName: false, email: false, phone: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Mirrors auth-service RegisterDto.
  const errors: Record<Field, string | undefined> = {
    fullName: fullName.trim() ? undefined : t('Full name is required'),
    email: !email.trim() ? t('Email is required') : !emailPattern.test(email.trim()) ? t('Enter a valid email') : undefined,
    phone: phoneError(phone),
    password: !password
      ? t('Password is required')
      : password.length < 8
        ? t('Password must be at least 8 characters')
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
      const requestedAt = Date.now();
      const auth = await registerAccount({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        // The API stores E.164; send it normalized (#152).
        phone: normalizeEgyptianMobile(phone) ?? undefined,
        role: 'RESTAURANT_OWNER',
      });
      if ('verificationRequired' in auth) {
        // #203: the account exists, and registering emailed a code; signing in waits for it.
        startEmailVerification(email.trim(), requestedAt);
        router.replace('/verify-email');
        return;
      }
      await setSession(auth.accessToken, auth.refreshToken);
      // #28: a new owner goes straight to setting up their restaurant.
      router.replace('/onboarding');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('Unable to create your account right now.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title={t('Create an owner account')}
      subtitle={t('Put your restaurant on Delivery Plus. You set it up next, and we review it before customers see it.')}
      aside={<RestaurantBrandPanel />}
      footer={
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t('Already have an account?')}
          </ThemedText>
          <Link href="/login" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8} testID="register-sign-in" nativeID="register-sign-in">
              <ThemedText type="linkPrimary">{t('Sign in')}</ThemedText>
            </Pressable>
          </Link>
        </>
      }
    >
      <FormTextInput
        testID="register-full-name"
        label={t('Full name')}
        icon="user"
        value={fullName}
        onChangeText={setFullName}
        onBlur={markTouched('fullName')}
        error={visibleError('fullName')}
        placeholder={t('Your full name')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormTextInput
        testID="register-email"
        ref={emailRef}
        label={t('Email')}
        icon="mail"
        value={email}
        onChangeText={setEmail}
        onBlur={markTouched('email')}
        error={visibleError('email')}
        placeholder={t('you@example.com')}
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
        testID="register-phone"
        ref={phoneRef}
        label={t('Phone')}
        prefix="+20"
        value={phone}
        onChangeText={setPhone}
        onBlur={markTouched('phone')}
        error={visibleError('phone')}
        hint={t(PHONE_HINT)}
        placeholder={t('Optional')}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormTextInput
        testID="register-password"
        ref={passwordRef}
        label={t('Password')}
        icon="lock"
        value={password}
        onChangeText={setPassword}
        onBlur={markTouched('password')}
        error={visibleError('password')}
        hint={t('At least 8 characters')}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void handleSubmit()}
      />

      {error ? (
        <View style={styles.alert}>
          <InlineAlert message={error} testID="register-error" />
        </View>
      ) : null}

      <AppButton testID="register-submit" title={t('Create account')} onPress={() => void handleSubmit()} loading={isSubmitting} />
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  alert: {
    marginBottom: Spacing.three,
  },
});
