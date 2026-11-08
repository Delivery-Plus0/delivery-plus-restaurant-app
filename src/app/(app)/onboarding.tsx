import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LocationMap, MAP_AVAILABLE } from '@/components/location-map';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Icon } from '@/components/ui/icon';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-view';
import { BrandColors, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  confirmRestaurantImage,
  createRestaurant,
  createRestaurantImageUpload,
  submitApplication,
  updateRestaurant,
  type Restaurant,
  type RestaurantImageType,
} from '@/services/restaurants';
import { reloadMyRestaurants, storeMyRestaurant, useRestaurantMenu, useSelectedRestaurant } from '@/state/restaurant';
import { pickImage, uploadToPresigned } from '@/utils/image-upload';
import { formatPhone } from '@/utils/phone';
import {
  APPLICATION_STEPS,
  REQUIREMENTS,
  STEP_TITLES,
  approvalStatusOf,
  canEditApplication,
  describeApplicationError,
  detailsErrors,
  detailsFormOf,
  detailsPayload,
  hasLocation,
  missingRequirements,
  parseCoordinate,
  type ApplicationStep,
  type DetailsErrors,
  type DetailsForm,
} from '@/utils/restaurant-application';

/** Keeps the form readable on wide screens. */
const MAX_WIDTH = 760;

/**
 * Restaurant onboarding (#28): business details → location → logo and cover → menu → review and submit.
 * The restaurant is created at the location step (the API needs an address); every later step saves as
 * it goes, so the owner can leave and come back. Only a draft or a rejected application is editable.
 */
export default function OnboardingScreen() {
  const { restaurants, restaurant } = useSelectedRestaurant();

  if (restaurants.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('Set up your restaurant')} showBack />
        <View style={styles.content}>
          <SkeletonList count={3} itemHeight={72} />
        </View>
      </Screen>
    );
  }
  if (restaurants.error && restaurants.data === undefined) {
    return (
      <Screen>
        <ScreenHeader title={t('Set up your restaurant')} showBack />
        <ErrorState error={restaurants.error} onRetry={() => void restaurants.refresh()} />
      </Screen>
    );
  }
  // Under review or approved: nothing to fill in; the dashboard shows where it stands.
  if (restaurant && !canEditApplication(restaurant)) return <Redirect href="/home" />;

  // Not keyed by the restaurant: creating it at the location step must not restart the wizard.
  return <Wizard restaurant={restaurant} />;
}

function Wizard({ restaurant }: { restaurant: Restaurant | null }) {
  const menu = useRestaurantMenu(restaurant?.id ?? null);
  const [step, setStep] = useState<ApplicationStep>(() => firstStep(restaurant));
  const [details, setDetails] = useState<DetailsForm>(() => detailsFormOf(restaurant));
  const [detailsTouched, setDetailsTouched] = useState(false);
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [latitude, setLatitude] = useState(restaurant?.latitude != null ? String(restaurant.latitude) : '');
  const [longitude, setLongitude] = useState(restaurant?.longitude != null ? String(restaurant.longitude) : '');
  const [locationTouched, setLocationTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);

  const index = APPLICATION_STEPS.indexOf(step);
  const errors: DetailsErrors = detailsErrors(details);
  const lat = parseCoordinate(latitude, 'latitude');
  const lng = parseCoordinate(longitude, 'longitude');
  const coordinatesError =
    (latitude.trim() || longitude.trim()) && (lat === null || lng === null)
      ? t('Enter both coordinates as numbers, or tap the map')
      : !latitude.trim() && !longitude.trim()
        ? t('Place the pin on the map, or enter the coordinates')
        : undefined;
  const addressError = address.trim().length < 3 ? t('Enter the street address') : undefined;
  const missing = restaurant ? missingRequirements(restaurant, menu.data) : [];

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  function go(next: ApplicationStep) {
    setError(null);
    setNotice(null);
    setStep(next);
  }

  /** Runs one save at a time and shows the API's reason when it fails. */
  async function run(label: string, action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(describeApplicationError(caught, t('That did not go through. Try again.')));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  async function saveDetails() {
    setDetailsTouched(true);
    if (Object.keys(errors).length) return;
    if (!restaurant) {
      // Kept here until the location step: the API creates a restaurant with its address.
      go('location');
      return;
    }
    await run('details', async () => {
      storeMyRestaurant(await updateRestaurant(restaurant.id, detailsPayload(details)));
      go('location');
    });
  }

  async function saveLocation() {
    setLocationTouched(true);
    if (addressError || coordinatesError || lat === null || lng === null) return;
    await run('location', async () => {
      const location = { address: address.trim(), latitude: lat, longitude: lng };
      const saved = restaurant
        ? await updateRestaurant(restaurant.id, location)
        : await createRestaurant({ ...withoutNulls(detailsPayload(details)), name: details.name.trim(), ...location });
      storeMyRestaurant(saved);
      go('photos');
    });
  }

  function useCurrentLocation() {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;
    setBusy('geolocation');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(Math.round(position.coords.latitude * 1e6) / 1e6));
        setLongitude(String(Math.round(position.coords.longitude * 1e6) / 1e6));
        setBusy(null);
      },
      () => {
        setError(t('Your location is not available. Tap the map where the restaurant is instead.'));
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function uploadImage(imageType: RestaurantImageType) {
    if (!restaurant) return;
    await run(imageType, async () => {
      const picked = await pickImage('library');
      if (!picked) return;
      const presigned = await createRestaurantImageUpload(restaurant.id, imageType, picked.mimeType);
      await uploadToPresigned(presigned, picked);
      storeMyRestaurant(await confirmRestaurantImage(restaurant.id, imageType, presigned.objectKey));
      setNotice(imageType === 'logo' ? t('Logo saved.') : t('Cover photo saved.'));
    });
  }

  async function submit() {
    if (!restaurant || missing.length) return;
    await run('submit', async () => {
      storeMyRestaurant(await submitApplication(restaurant.id));
      await reloadMyRestaurants().catch(() => undefined);
      router.replace('/home');
    });
  }

  const back = index > 0 ? () => go(APPLICATION_STEPS[index - 1]) : undefined;

  return (
    <Screen>
      <ScreenHeader title={t('Set up your restaurant')} subtitle={t('Step {current} of {total}: {title}', { current: index + 1, total: APPLICATION_STEPS.length, title: STEP_TITLES[step] })} showBack />
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stepper current={step} reachable={(candidate) => candidate === 'details' || candidate === 'location' || Boolean(restaurant)} onSelect={go} />

        {approvalStatusOf(restaurant ?? {}) === 'REJECTED' && restaurant ? (
          <Card testID="onboarding-review-note">
            <View style={styles.row}>
              <Icon name="error" size={20} color={BrandColors.danger} />
              <ThemedText type="defaultBold">{t('Your application needs changes')}</ThemedText>
            </View>
            <ThemedText type="small">{restaurant.approvalNote ?? restaurant.lastReview?.note ?? t('The reviewer did not leave a note.')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('Fix what the note says, then submit again from the last step.')}
            </ThemedText>
          </Card>
        ) : null}

        {notice ? <InlineAlert message={notice} tone="success" testID="onboarding-notice" /> : null}
        {error ? <InlineAlert message={error} testID="onboarding-error" /> : null}

        {step === 'details' ? (
          <Card testID="onboarding-step-details">
            <ThemedText type="small" themeColor="textSecondary">
              {t('Customers see the restaurant name. The legal details stay private; only the legal name is required.')}
            </ThemedText>
            <FormTextInput testID="onboarding-name" label={t('Restaurant name')} icon="store" value={details.name} onChangeText={(name) => setDetails({ ...details, name })} error={detailsTouched ? errors.name : undefined} />
            <FormTextInput testID="onboarding-legal-name" label={t('Legal name')} icon="edit" value={details.legalName} onChangeText={(legalName) => setDetails({ ...details, legalName })} hint={t('As registered, e.g. Cairo Kitchen LLC. Required to submit.')} error={detailsTouched ? errors.legalName : undefined} />
            <FormTextInput testID="onboarding-registration" label={t('Commercial registration number')} value={details.commercialRegistrationNumber} onChangeText={(value) => setDetails({ ...details, commercialRegistrationNumber: value })} placeholder={t('Optional')} error={detailsTouched ? errors.commercialRegistrationNumber : undefined} />
            <FormTextInput testID="onboarding-tax-card" label={t('Tax card number')} value={details.taxCardNumber} onChangeText={(value) => setDetails({ ...details, taxCardNumber: value })} placeholder={t('Optional')} error={detailsTouched ? errors.taxCardNumber : undefined} />
            <FormTextInput testID="onboarding-phone" label={t('Contact phone')} icon="phone" prefix="+20" keyboardType="phone-pad" value={details.contactPhone} onChangeText={(contactPhone) => setDetails({ ...details, contactPhone })} hint={t('Drivers call this number during a delivery. Required to submit.')} error={detailsTouched ? errors.contactPhone : undefined} />
            <FormTextInput testID="onboarding-cuisine" label={t('Cuisine')} icon="food" value={details.cuisineTags} onChangeText={(cuisineTags) => setDetails({ ...details, cuisineTags })} hint={t('Up to 5, separated by commas, e.g. Burgers, Fries')} error={detailsTouched ? errors.cuisineTags : undefined} />
            <FormTextInput testID="onboarding-description" label={t('Description')} value={details.description} onChangeText={(description) => setDetails({ ...details, description })} placeholder={t('Optional')} multiline />
            <StepFooter back={back} title={t('Next')} testID="onboarding-next" onPress={() => void saveDetails()} loading={busy === 'details'} />
          </Card>
        ) : null}

        {step === 'location' ? (
          <Card testID="onboarding-step-location">
            <ThemedText type="small" themeColor="textSecondary">
              {t('Drivers pick up here, and customers within your delivery area see your restaurant.')}
            </ThemedText>
            <FormTextInput testID="onboarding-address" label={t('Street address')} icon="location" value={address} onChangeText={setAddress} error={locationTouched ? addressError : undefined} />
            {MAP_AVAILABLE ? (
              <>
                <LocationMap
                  testID="onboarding-map"
                  latitude={lat}
                  longitude={lng}
                  onPick={(pickedLat, pickedLng) => {
                    setLatitude(String(pickedLat));
                    setLongitude(String(pickedLng));
                  }}
                />
                <View style={styles.start}>
                  <AppButton testID="onboarding-use-location" title={t('Use my current location')} icon="location" variant="secondary" size="sm" fullWidth={false} loading={busy === 'geolocation'} onPress={useCurrentLocation} />
                </View>
              </>
            ) : null}
            <View style={styles.coordinates}>
              <View style={styles.flex}>
                <FormTextInput testID="onboarding-latitude" label={t('Latitude')} keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} placeholder="30.0444" />
              </View>
              <View style={styles.flex}>
                <FormTextInput testID="onboarding-longitude" label={t('Longitude')} keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} placeholder="31.2357" />
              </View>
            </View>
            {locationTouched && coordinatesError ? <InlineAlert message={coordinatesError} testID="onboarding-location-error" /> : null}
            <StepFooter back={back} title={restaurant ? t('Next') : t('Create my restaurant')} testID="onboarding-next" onPress={() => void saveLocation()} loading={busy === 'location'} />
          </Card>
        ) : null}

        {step === 'photos' && restaurant ? (
          <Card testID="onboarding-step-photos">
            <ThemedText type="small" themeColor="textSecondary">
              {t('Optional, but restaurants with photos get more orders. JPEG, PNG or WebP, up to 10 MB.')}
            </ThemedText>
            <PhotoRow title={t('Logo')} url={restaurant.logoUrl} testID="onboarding-logo" busy={busy === 'logo'} onPick={() => void uploadImage('logo')} />
            <PhotoRow title={t('Cover photo')} url={restaurant.coverImageUrl} testID="onboarding-cover" busy={busy === 'cover'} onPick={() => void uploadImage('cover')} wide />
            <StepFooter back={back} title={t('Next')} testID="onboarding-next" onPress={() => go('menu')} />
          </Card>
        ) : null}

        {step === 'menu' && restaurant ? (
          <Card testID="onboarding-step-menu">
            <ThemedText type="small" themeColor="textSecondary">
              {t('Add at least one category and one available item. You can keep editing the menu while your application is reviewed.')}
            </ThemedText>
            <View style={styles.row} testID="onboarding-menu-summary" nativeID="onboarding-menu-summary">
              <Badge label={t('Categories: {count}', { count: menu.data?.categories.length ?? 0 })} tone={menu.data?.categories.length ? 'success' : 'neutral'} />
              <Badge label={t('Available items: {count}', { count: menu.data?.items.filter((item) => item.available).length ?? 0 })} tone={menu.data?.items.some((item) => item.available) ? 'success' : 'neutral'} />
            </View>
            <View style={styles.row}>
              <AppButton testID="onboarding-open-menu" title={t('Open the menu editor')} icon="food" variant="secondary" size="sm" fullWidth={false} onPress={() => router.push('/menu')} />
              <AppButton testID="onboarding-menu-refresh" title={t('Refresh')} icon="refresh" variant="secondary" size="sm" fullWidth={false} loading={menu.refreshing} onPress={() => void menu.refresh()} />
            </View>
            <StepFooter back={back} title={t('Next')} testID="onboarding-next" onPress={() => go('review')} />
          </Card>
        ) : null}

        {step === 'review' && restaurant ? (
          <Card testID="onboarding-step-review">
            <Summary label={t('Restaurant name')} value={restaurant.name} />
            <Summary label={t('Legal name')} value={restaurant.legalName} />
            <Summary label={t('Commercial registration number')} value={restaurant.commercialRegistrationNumber} />
            <Summary label={t('Tax card number')} value={restaurant.taxCardNumber} />
            <Summary label={t('Contact phone')} value={restaurant.contactPhone ? formatPhone(restaurant.contactPhone) : null} />
            <Summary label={t('Cuisine')} value={restaurant.cuisineTags?.join(', ')} />
            <Summary label={t('Street address')} value={restaurant.address} />
            <Summary label={t('Location')} value={hasLocation(restaurant) ? `${restaurant.latitude}, ${restaurant.longitude}` : null} />

            {missing.length ? (
              <View style={styles.missing} testID="onboarding-missing" nativeID="onboarding-missing">
                <ThemedText type="defaultBold">{t('Before you submit')}</ThemedText>
                {missing.map((requirement) => (
                  <Pressable
                    key={requirement}
                    testID={`onboarding-missing-${requirement}`}
                    nativeID={`onboarding-missing-${requirement}`}
                    accessibilityRole="button"
                    accessibilityHint={t('Opens the step where you add it.')}
                    onPress={() => go(REQUIREMENTS[requirement].step)}
                    style={styles.missingRow}
                  >
                    <Icon name="error" size={18} color={BrandColors.danger} />
                    <ThemedText type="small" style={styles.flex}>
                      {REQUIREMENTS[requirement].label}
                    </ThemedText>
                    <Icon name="chevronRight" size={18} color={BrandColors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <InlineAlert tone="info" message={t('Everything is in place. We review new restaurants before customers can see them; you can keep editing the menu meanwhile.')} testID="onboarding-ready" />
            )}
            <StepFooter back={back} title={approvalStatusOf(restaurant) === 'REJECTED' ? t('Submit again') : t('Submit for review')} testID="onboarding-submit" disabled={missing.length > 0 || menu.isLoading} loading={busy === 'submit'} onPress={() => void submit()} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** The step the owner left off at: the first one with something missing. */
function firstStep(restaurant: Restaurant | null): ApplicationStep {
  if (!restaurant) return 'details';
  if (!restaurant.legalName || !restaurant.contactPhone) return 'details';
  if (!hasLocation(restaurant)) return 'location';
  return 'menu';
}

/** create() takes optional fields as absent, not null. */
function withoutNulls<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null)) as Partial<T>;
}

type StepFooterProps = { back?: () => void; title: string; onPress: () => void; testID: string; disabled?: boolean; loading?: boolean };

function StepFooter({ back, title, onPress, testID, disabled, loading }: StepFooterProps) {
  return (
    <View style={styles.footer}>
      {back ? <AppButton testID="onboarding-back" title={t('Back')} variant="secondary" fullWidth={false} onPress={back} /> : <View />}
      <AppButton testID={testID} title={title} fullWidth={false} disabled={disabled} loading={loading} onPress={onPress} />
    </View>
  );
}

function Stepper({ current, reachable, onSelect }: { current: ApplicationStep; reachable: (step: ApplicationStep) => boolean; onSelect: (step: ApplicationStep) => void }) {
  const currentIndex = APPLICATION_STEPS.indexOf(current);
  return (
    <View style={styles.stepper} accessibilityRole="tablist">
      {APPLICATION_STEPS.map((step, index) => {
        const selected = step === current;
        const enabled = reachable(step);
        return (
          <Pressable
            key={step}
            testID={`onboarding-tab-${step}`}
            nativeID={`onboarding-tab-${step}`}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !enabled }}
            disabled={!enabled}
            onPress={() => onSelect(step)}
            style={[styles.stepChip, selected && styles.stepChipSelected, !enabled && styles.stepChipDisabled]}
          >
            <View style={[styles.stepNumber, (selected || index < currentIndex) && styles.stepNumberDone]}>
              <ThemedText type="caption" style={selected || index < currentIndex ? styles.stepNumberTextDone : undefined}>
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText type="small" numberOfLines={1}>
              {STEP_TITLES[step]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function PhotoRow({ title, url, busy, onPick, testID, wide = false }: { title: string; url?: string | null; busy: boolean; onPick: () => void; testID: string; wide?: boolean }) {
  return (
    <View style={styles.photoRow}>
      <View style={[styles.photo, wide && styles.photoWide]}>
        {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={title} /> : <Icon name="store" size={24} color={BrandColors.textSecondary} />}
      </View>
      <View style={styles.flex}>
        <ThemedText type="defaultBold">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {url ? t('Saved') : t('Not added yet')}
        </ThemedText>
      </View>
      <AppButton testID={testID} title={url ? t('Replace') : t('Choose image')} variant="secondary" size="sm" fullWidth={false} loading={busy} onPress={onPick} />
    </View>
  );
}

function Summary({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.summaryLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.flex}>
        {value?.trim() ? value : t('Not provided')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  start: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.three },
  coordinates: { flexDirection: 'row', gap: Spacing.three },
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  stepChipSelected: { borderColor: BrandColors.primary, backgroundColor: BrandColors.primarySoft },
  stepChipDisabled: { opacity: 0.5 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.surfaceMuted,
  },
  stepNumberDone: { backgroundColor: BrandColors.primary },
  stepNumberTextDone: { color: BrandColors.onPrimary },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  photo: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.surfaceMuted,
  },
  photoWide: { width: 112 },
  missing: { gap: Spacing.two, marginTop: Spacing.two },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.sm,
    backgroundColor: BrandColors.surfaceMuted,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  summaryLabel: { width: 180 },
});
