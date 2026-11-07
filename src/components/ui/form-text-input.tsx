import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BrandColors, FontFamily, IconSize, Layout, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

type FormTextInputProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Leading icon inside the field (Figma "Input": mail for email, lock for password, user for name). */
  icon?: IconName;
  ref?: Ref<TextInput>;
};

/**
 * Figma "Input" (Redesign 2026): label, a 52 px field with an optional leading icon, and a helper or error line.
 * A `secureTextEntry` field gets a show/hide button (`<testID>-visibility`).
 */
export function FormTextInput({ label, error, hint, icon, style, onFocus, onBlur, secureTextEntry, ref, ...props }: FormTextInputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const testID = props.testID;
  const hidden = Boolean(secureTextEntry) && !revealed;
  const disabled = props.editable === false;

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
          disabled && styles.fieldDisabled,
        ]}
      >
        {icon ? <Icon name={icon} size={IconSize.md} color={BrandColors.textSecondary} /> : null}
        <TextInput
          {...props}
          secureTextEntry={hidden}
          nativeID={props.nativeID ?? testID}
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, disabled && styles.inputDisabled, style]}
          placeholderTextColor={BrandColors.textMuted}
        />
        {secureTextEntry ? (
          <Pressable
            testID={testID ? `${testID}-visibility` : undefined}
            nativeID={testID ? `${testID}-visibility` : undefined}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('Hide password') : t('Show password')}
            hitSlop={8}
            onPress={() => setRevealed((value) => !value)}
            style={styles.trailing}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={IconSize.md} color={BrandColors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.helperRow}>
          <Icon name="error" size={IconSize.sm} color={BrandColors.danger} />
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: Spacing.three,
    gap: Spacing.one + Spacing.half,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: FontFamily.medium,
    color: BrandColors.text,
  },
  labelDisabled: {
    color: BrandColors.textDisabled,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    minHeight: Layout.inputHeight,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three - Spacing.half,
    backgroundColor: BrandColors.surface,
  },
  fieldFocused: {
    borderWidth: 2,
    borderColor: BrandColors.inverse,
    paddingHorizontal: Spacing.three - Spacing.half - 1,
  },
  fieldError: {
    borderWidth: 2,
    borderColor: BrandColors.danger,
    paddingHorizontal: Spacing.three - Spacing.half - 1,
  },
  fieldDisabled: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  input: {
    flex: 1,
    minHeight: Layout.inputHeight - 2,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: BrandColors.text,
    paddingVertical: 0,
  },
  inputDisabled: {
    color: BrandColors.textDisabled,
  },
  trailing: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one + Spacing.half,
  },
  errorText: {
    flex: 1,
    color: BrandColors.danger,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: FontFamily.medium,
  },
  hintText: {
    color: BrandColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.regular,
  },
});
