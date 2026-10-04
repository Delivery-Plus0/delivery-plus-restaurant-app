import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Icon, type IconName } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-view';
import { BrandColors, IconSize, Radius, Spacing } from '@/constants/theme';
import { clearSession, useAuthSession } from '@/services/session';
import type { UserProfile } from '@/services/users';
import { saveProfile, useProfile } from '@/state/profile';
import { confirm } from '@/utils/confirm';

export default function ProfileScreen() {
  const profile = useProfile();
  const { session } = useAuthSession();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to place orders.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (ok) await clearSession();
  };

  const header = (
    <ScreenHeader
      title="Profile"
      right={
        profile.data && !editing ? (
          <AppButton
            title="Edit"
            icon="edit"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => {
              setNotice(null);
              setEditing(true);
            }}
          />
        ) : null
      }
    />
  );

  if (profile.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen>
        {header}
        <ErrorState error={profile.error} onRetry={() => void profile.refresh()} />
        <View style={styles.signOutFallback}>
          <AppButton title="Sign out" icon="logout" variant="secondary" onPress={() => void signOut()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            editing ? undefined : (
              <RefreshControl
                refreshing={profile.refreshing}
                onRefresh={() => void profile.refresh()}
                tintColor={BrandColors.primary}
                colors={[BrandColors.primary]}
              />
            )
          }
        >
          <View style={styles.identity}>
            <Avatar profile={profile.data} />
            <View style={styles.flex}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {profile.data.fullName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {profile.data.email}
              </ThemedText>
            </View>
          </View>

          {notice ? <InlineAlert tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}

          {editing ? (
            <EditProfileForm
              profile={profile.data}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                setNotice('Profile updated.');
              }}
            />
          ) : (
            <Card>
              <DetailRow icon="person" label="Full name" value={profile.data.fullName} />
              <DetailRow icon="mail" label="Email" value={profile.data.email} />
              <DetailRow icon="phone" label="Phone" value={profile.data.phone} placeholder="Add a phone number" />
              <DetailRow
                icon="location"
                label="Delivery address"
                value={profile.data.address}
                placeholder="Add your address"
                last
              />
            </Card>
          )}

          {!editing ? (
            <>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
                Signed in as {session?.user.role === 'CUSTOMER' ? 'a customer' : session?.user.role}
              </ThemedText>
              <AppButton testID="profile-sign-out" title="Sign out" icon="logout" variant="danger" onPress={() => void signOut()} />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Avatar({ profile }: { profile: UserProfile }) {
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={styles.avatar}>
      {profile.avatarUrl ? (
        <Image source={profile.avatarUrl} style={styles.avatarImage} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <ThemedText type="heading" style={styles.avatarText}>
          {initials || '?'}
        </ThemedText>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  placeholder,
  last = false,
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  placeholder?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailDivider]}>
      <Icon name={icon} size={IconSize.md} color={BrandColors.textMuted} />
      <View style={styles.flex}>
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="default" themeColor={value ? 'text' : 'textSecondary'}>
          {value || placeholder || '—'}
        </ThemedText>
      </View>
    </View>
  );
}

function EditProfileForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: UserProfile;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = fullName.trim() ? undefined : 'Full name is required';

  const handleSave = async () => {
    if (nameError) return;
    setError(null);
    setSaving(true);
    try {
      await saveProfile({ fullName: fullName.trim(), phone: phone.trim(), address: address.trim() });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      {error ? <InlineAlert message={error} /> : null}
      <FormTextInput
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={nameError}
      />
      <FormTextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="Optional"
      />
      <FormTextInput
        label="Delivery address"
        value={address}
        onChangeText={setAddress}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        placeholder="Street, building, apartment"
        multiline
        style={styles.addressInput}
      />
      <View style={styles.formActions}>
        <View style={styles.flex}>
          <AppButton title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
        </View>
        <View style={styles.flex}>
          <AppButton title="Save" onPress={() => void handleSave()} loading={saving} disabled={Boolean(nameError)} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: BrandColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: BrandColors.primaryText,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  detailDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
  },
  meta: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  signOutFallback: {
    padding: Spacing.four,
  },
  addressInput: {
    height: 88,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
