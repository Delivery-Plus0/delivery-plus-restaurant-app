import { useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { BrandColors, Layout, Radius, Spacing } from '@/constants/theme';

type FormTextInputProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<TextInput>;
};

export function FormTextInput({ label, error, hint, style, onFocus, onBlur, ref, ...props }: FormTextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        nativeID={props.nativeID ?? props.testID}
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
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null, style]}
        placeholderTextColor={BrandColors.textMuted}
      />
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.text,
    marginBottom: Spacing.two,
  },
  input: {
    height: Layout.inputHeight,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    backgroundColor: BrandColors.surface,
    color: BrandColors.text,
  },
  inputFocused: {
    borderColor: BrandColors.text,
  },
  inputError: {
    borderColor: BrandColors.danger,
  },
  errorText: {
    marginTop: Spacing.one,
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  hintText: {
    marginTop: Spacing.one,
    color: BrandColors.textSecondary,
    fontSize: 13,
  },
});
