import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { changePassword } from '@/services/password';
import { confirmPasswordError, describeChangeRefusal, newPasswordError } from '@/utils/password';
import { t } from '@/i18n';

type ChangePasswordSheetProps = {
  onClose: () => void;
  /** The password changed: this device stays signed in, every other one was signed out. */
  onChanged: () => void;
};

/**
 * Shared kit (backend #35): change the password while signed in, with the current one. Opened from the
 * profile (customer, driver) or the header (restaurant). Passwords are never kept after it closes.
 */
export function ChangePasswordSheet({ onClose, onChanged }: ChangePasswordSheetProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const currentError = current ? undefined : t('Enter your current password');
  const nextError = newPasswordError(next);
  const confirmError = confirmPasswordError(next, confirmation);

  async function submit() {
    setSubmitted(true);
    if (currentError || nextError || confirmError || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      onChanged();
    } catch (caught) {
      setError(describeChangeRefusal(caught));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setError(null);
  };

  return (
    <Sheet visible title={t('Change password')} onClose={onClose} testID="change-password-sheet">
      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('You stay signed in here. Every other device is signed out.')}
        </ThemedText>
        <FormTextInput
          testID="change-password-current"
          label={t('Current password')}
          value={current}
          onChangeText={edit(setCurrent)}
          error={submitted ? currentError : undefined}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextRef.current?.focus()}
        />
        <FormTextInput
          testID="change-password-new"
          ref={nextRef}
          label={t('New password')}
          value={next}
          onChangeText={edit(setNext)}
          error={submitted ? nextError : undefined}
          hint={t('At least 8 characters')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <FormTextInput
          testID="change-password-confirm"
          ref={confirmRef}
          label={t('Confirm new password')}
          value={confirmation}
          onChangeText={edit(setConfirmation)}
          error={submitted ? confirmError : undefined}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        {error ? <InlineAlert message={error} testID="change-password-error" /> : null}
        <AppButton testID="change-password-submit" title={t('Change password')} loading={busy} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
});
