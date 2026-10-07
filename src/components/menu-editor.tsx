import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Dialog } from '@/components/ui/dialog';
import { FormTextInput } from '@/components/ui/form-text-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Sheet } from '@/components/ui/sheet';
import { BrandColors, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import {
  archiveMenuItem,
  confirmItemImage,
  createCategory,
  createItemImageUploadUrl,
  createMenuItem,
  removeItemImage,
  renameCategory,
  updateMenuItem,
  type MenuCategory,
  type MenuItem,
} from '@/services/menus';
import { pickImage, uploadToPresigned } from '@/utils/image-upload';
import { reloadMenu } from '@/state/restaurant';
import { DESCRIPTION_MAX, NAME_MAX, draftFromItem, parsePrice, sortCategories, validateItemDraft, type ItemDraftInput } from '@/utils/menu-editor';

const errorMessage = (caught: unknown, fallback: string) => (caught instanceof ApiError ? caught.message : fallback);

type ItemSheetProps = {
  restaurantId: string;
  categories: MenuCategory[];
  /** null: a new item. */
  item: MenuItem | null;
  /** Category preselected for a new item. */
  categoryId: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
};

/** Create or edit one item (#148). Archive lives here too, behind a confirmation. */
export function ItemSheet({ restaurantId, categories, item, categoryId, onClose, onDone }: ItemSheetProps) {
  const [draft, setDraft] = useState<ItemDraftInput>(() => draftFromItem(item, categoryId));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validateItemDraft(draft);
  const set = (patch: Partial<ItemDraftInput>) => setDraft((current) => ({ ...current, ...patch }));

  async function save() {
    setSubmitted(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      price: parsePrice(draft.price) as number,
      categoryId: draft.categoryId,
    };
    try {
      if (item) await updateMenuItem(item.id, payload);
      else await createMenuItem(restaurantId, payload);
      await reloadMenu(restaurantId);
      onDone(item ? `Saved ${payload.name}` : `Added ${payload.name} to the menu`);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not save this item. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!item) return;
    setConfirmingArchive(false);
    setSaving(true);
    setError(null);
    try {
      await archiveMenuItem(item.id);
      await reloadMenu(restaurantId);
      onDone(`Archived ${item.name}`);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not archive this item. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  const show = (field: keyof typeof errors) => (submitted ? errors[field] : undefined);

  return (
    <Sheet visible title={item ? `Edit ${item.name}` : 'New menu item'} onClose={onClose} testID="item-editor">
      <FormTextInput
        testID="item-editor-name"
        label="Name"
        value={draft.name}
        onChangeText={(name) => set({ name })}
        maxLength={NAME_MAX + 20}
        error={show('name')}
        placeholder="Koshary"
      />
      <FormTextInput
        testID="item-editor-description"
        label="Description (optional)"
        value={draft.description}
        onChangeText={(description) => set({ description })}
        maxLength={DESCRIPTION_MAX + 50}
        error={show('description')}
        multiline
      />
      <FormTextInput
        testID="item-editor-price"
        label="Price (EGP)"
        value={draft.price}
        onChangeText={(price) => set({ price })}
        keyboardType="decimal-pad"
        error={show('price')}
        placeholder="45.00"
      />
      {categories.length ? (
        <View style={styles.field}>
          <ThemedText type="smallBold">Category</ThemedText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {sortCategories(categories).map((category) => {
              const selected = draft.categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  testID={`item-editor-category-${category.id}`}
                  nativeID={`item-editor-category-${category.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => set({ categoryId: category.id })}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <ThemedText type="small" style={selected ? styles.chipTextSelected : undefined}>
                    {category.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {item ? <ItemPhoto restaurantId={restaurantId} item={item} /> : (
        <ThemedText type="small" themeColor="textSecondary" testID="item-editor-photo-hint">
          Save the item first, then add a photo.
        </ThemedText>
      )}
      {error ? <InlineAlert message={error} testID="item-editor-error" /> : null}
      <AppButton testID="item-editor-save" title={item ? 'Save changes' : 'Add to menu'} loading={saving} onPress={() => void save()} />
      {item ? (
        <AppButton testID="item-editor-archive" title="Archive item" variant="danger" disabled={saving} onPress={() => setConfirmingArchive(true)} />
      ) : null}
      <Dialog
        visible={confirmingArchive}
        title={`Archive ${item?.name ?? 'this item'}?`}
        message="Customers stop seeing it and can't order it. Past orders keep it. This can't be undone from the app yet."
        confirmLabel="Archive"
        destructive
        onConfirm={() => void archive()}
        onCancel={() => setConfirmingArchive(false)}
        testID="archive-dialog"
      />
    </Sheet>
  );
}

/**
 * The item's photo (#149): add, replace (upload the new one, then remove the old) or remove. The
 * menu shows the first image; uploads go straight to storage with the backend's presigned policy.
 */
function ItemPhoto({ restaurantId, item }: { restaurantId: string; item: MenuItem }) {
  const [current, setCurrent] = useState(item.images ?? []);
  const [busy, setBusy] = useState<'uploading' | 'removing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const primary = current[0] ?? null;

  async function change() {
    if (busy) return;
    setError(null);
    try {
      const picked = await pickImage('library');
      if (!picked) return;
      setBusy('uploading');
      const presigned = await createItemImageUploadUrl(item.id, picked.mimeType);
      await uploadToPresigned(presigned, picked);
      let updated = await confirmItemImage(item.id, presigned.objectKey);
      // Replace: the new image is appended, so dropping the old primary promotes it.
      if (primary) updated = await removeItemImage(item.id, primary.id);
      setCurrent(updated.images ?? []);
      await reloadMenu(restaurantId);
    } catch (caught) {
      setError(errorMessage(caught, caught instanceof Error ? caught.message : 'Could not upload this photo.'));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!primary || busy) return;
    setBusy('removing');
    setError(null);
    try {
      const updated = await removeItemImage(item.id, primary.id);
      setCurrent(updated.images ?? []);
      await reloadMenu(restaurantId);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not remove this photo.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.field} testID="item-editor-photo" nativeID="item-editor-photo">
      <ThemedText type="smallBold">Photo</ThemedText>
      {primary ? (
        <View testID="item-editor-photo-image" nativeID="item-editor-photo-image">
          <Image source={{ uri: primary.url }} style={styles.photo} contentFit="cover" accessibilityLabel={`Photo of ${item.name}`} />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" testID="item-editor-photo-empty">
          No photo yet. Customers see a placeholder.
        </ThemedText>
      )}
      {busy ? (
        <ThemedText type="small" themeColor="textSecondary" testID="item-editor-photo-status">
          {busy === 'uploading' ? 'Uploading…' : 'Removing…'}
        </ThemedText>
      ) : null}
      {error ? <InlineAlert message={error} testID="item-editor-photo-error" /> : null}
      <View style={styles.photoActions}>
        <AppButton
          testID="item-editor-photo-pick"
          title={primary ? 'Replace photo' : 'Add photo'}
          variant="secondary"
          size="sm"
          loading={busy === 'uploading'}
          disabled={busy !== null}
          onPress={() => void change()}
        />
        {primary ? (
          <AppButton testID="item-editor-photo-remove" title="Remove photo" variant="ghost" size="sm" disabled={busy !== null} onPress={() => void remove()} />
        ) : null}
      </View>
    </View>
  );
}

type CategorySheetProps = {
  restaurantId: string;
  /** null: a new category. */
  category: MenuCategory | null;
  nextDisplayOrder: number;
  onClose: () => void;
  onDone: (message: string) => void;
};

export function CategorySheet({ restaurantId, category, nextDisplayOrder, onClose, onDone }: CategorySheetProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  const nameError = !trimmed ? 'Enter a name' : trimmed.length > NAME_MAX ? `Keep the name under ${NAME_MAX} characters` : undefined;

  async function save() {
    setSubmitted(true);
    if (nameError || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (category) await renameCategory(category.id, trimmed);
      else await createCategory(restaurantId, trimmed, nextDisplayOrder);
      await reloadMenu(restaurantId);
      onDone(category ? `Renamed to ${trimmed}` : `Added the ${trimmed} category`);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not save this category. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible title={category ? 'Rename category' : 'New category'} onClose={onClose} testID="category-editor">
      <FormTextInput
        testID="category-editor-name"
        label="Name"
        value={name}
        onChangeText={setName}
        error={submitted ? nameError : undefined}
        placeholder="Mains"
        onSubmitEditing={() => void save()}
      />
      {error ? <InlineAlert message={error} testID="category-editor-error" /> : null}
      <AppButton testID="category-editor-save" title={category ? 'Save' : 'Add category'} loading={saving} onPress={() => void save()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  photo: {
    width: 160,
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surfaceMuted,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  chipSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
  chipTextSelected: {
    color: BrandColors.primaryText,
  },
});
