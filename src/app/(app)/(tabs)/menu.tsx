import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CategorySheet, ItemSheet } from '@/components/menu-editor';
import { RestaurantPicker } from '@/components/restaurant-picker';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState, StateView } from '@/components/ui/state-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import { deleteCategory, reorderCategories, type MenuCategory, type MenuItem, type MenuResponse } from '@/services/menus';
import type { OwnerRestaurantStatus, Restaurant } from '@/services/restaurants';
import { useAuthSession } from '@/services/session';
import { reloadMenu, selectRestaurantId, setItemAvailability, setRestaurantStatus, useRestaurantMenu, useSelectedRestaurant } from '@/state/restaurant';
import { canOwnerChangeStatus, OWNER_STATUSES } from '@/utils/availability';
import { editorSections, moveCategory } from '@/utils/menu-editor';
import { formatMoney } from '@/utils/format';
import { RESTAURANT_STATUS_META } from '@/utils/order-status';
import { t } from '@/i18n';

/** Keeps the menu list readable on wide screens. */
const MAX_MENU_WIDTH = 760;

const errorMessage = (caught: unknown, fallback: string) => (caught instanceof ApiError ? caught.message : fallback);

export default function MenuScreen() {
  const { session } = useAuthSession();
  const { restaurants, restaurant } = useSelectedRestaurant();
  const menu = useRestaurantMenu(restaurant?.id ?? null);

  async function refreshAll() {
    await Promise.all([restaurants.refresh(), restaurant ? menu.refresh() : Promise.resolve()]);
  }

  return (
    <Screen>
      <ScreenHeader title={t('Menu')} subtitle={restaurant?.name ?? session?.user.email} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={restaurants.refreshing || menu.refreshing} onRefresh={() => void refreshAll()} />}>
        {restaurants.isLoading ? (
          <SkeletonList count={2} itemHeight={72} />
        ) : restaurants.error && restaurants.data === undefined ? (
          <ErrorState error={restaurants.error} onRetry={() => void restaurants.refresh()} />
        ) : !restaurant ? (
          <StateView
            icon="store"
            title={t('No restaurant linked to this account')}
            message={t('Ask an administrator to connect your owner account to a restaurant.')}
            testID="restaurants-empty"
          />
        ) : (
          <>
            <RestaurantPicker restaurants={restaurants.data ?? []} selectedId={restaurant.id} onSelect={selectRestaurantId} />
            <StatusCard key={`${restaurant.id}:${restaurant.status}`} restaurant={restaurant} />

            {menu.isLoading ? (
              <SkeletonList count={4} itemHeight={64} />
            ) : menu.error && menu.data === undefined ? (
              <ErrorState error={menu.error} onRetry={() => void menu.refresh()} />
            ) : menu.data ? (
              <MenuEditor key={restaurant.id} restaurantId={restaurant.id} menu={menu.data} />
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

type Editing =
  | { kind: 'item'; item: MenuItem | null; categoryId: string | null }
  | { kind: 'category'; category: MenuCategory | null }
  | null;

/** Menu editor (#148): categories and items, with availability toggles kept from before. */
function MenuEditor({ restaurantId, menu }: { restaurantId: string; menu: MenuResponse }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const sections = editorSections(menu.categories, menu.items);

  function done(message: string) {
    setEditing(null);
    setError(null);
    setFeedback(message);
  }

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await action();
      await reloadMenu(restaurantId);
      setFeedback(message);
    } catch (caught) {
      setError(errorMessage(caught, t('That did not go through. Try again.')));
    } finally {
      setBusy(false);
    }
  }

  function move(category: MenuCategory, direction: -1 | 1) {
    const order = moveCategory(menu.categories, category.id, direction);
    if (order) void run(() => reorderCategories(restaurantId, order), direction < 0 ? t('Moved {name} up', { name: category.name }) : t('Moved {name} down', { name: category.name }));
  }

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.flex}>
          <AppButton testID="menu-add-item" title={t('Add item')} icon="plus" onPress={() => setEditing({ kind: 'item', item: null, categoryId: null })} />
        </View>
        <View style={styles.flex}>
          <AppButton testID="menu-add-category" title={t('Add category')} variant="secondary" onPress={() => setEditing({ kind: 'category', category: null })} />
        </View>
      </View>
      {feedback ? <InlineAlert tone="success" message={feedback} onDismiss={() => setFeedback(null)} testID="menu-feedback" /> : null}
      {error ? <InlineAlert message={error} onDismiss={() => setError(null)} testID="menu-error" /> : null}

      {sections.length === 0 ? (
        <StateView icon="food" title={t('No menu items yet')} message={t('Add a category, then your first item.')} testID="menu-empty" />
      ) : (
        sections.map((section, index) => {
          const category = section.category;
          return (
          <Card key={section.id} testID={`menu-section-${section.id}`}>
            <View style={styles.row}>
              <ThemedText type="smallBold" accessibilityRole="header" style={[styles.flex, styles.sectionTitle]} testID={`menu-section-${section.id}-title`}>
                {section.title}
              </ThemedText>
              {category ? (
                <View style={styles.sectionActions}>
                  <AppButton testID={`category-${section.id}-up`} title="↑" accessibilityHint={t('Moves this category up')} variant="ghost" size="sm" fullWidth={false} disabled={busy || index === 0} onPress={() => move(category, -1)} />
                  <AppButton testID={`category-${section.id}-down`} title="↓" accessibilityHint={t('Moves this category down')} variant="ghost" size="sm" fullWidth={false} disabled={busy || index >= menu.categories.length - 1} onPress={() => move(category, 1)} />
                  <AppButton testID={`category-${section.id}-rename`} title={t('Rename')} variant="ghost" size="sm" fullWidth={false} onPress={() => setEditing({ kind: 'category', category })} />
                  <AppButton testID={`category-${section.id}-delete`} title={t('Delete')} variant="ghost" size="sm" fullWidth={false} disabled={busy} onPress={() => setDeleting(category)} />
                </View>
              ) : null}
            </View>
            {section.items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" testID={`menu-section-${section.id}-empty`} nativeID={`menu-section-${section.id}-empty`}>
                {t('No items in this category yet.')}
              </ThemedText>
            ) : null}
            {section.items.map((item, itemIndex) => (
              <ItemRow
                key={`${item.id}:${item.available}`}
                restaurantId={restaurantId}
                item={item}
                first={itemIndex === 0}
                onEdit={() => setEditing({ kind: 'item', item, categoryId: item.categoryId ?? null })}
              />
            ))}
            {category ? (
              <AppButton testID={`category-${section.id}-add-item`} title={`Add an item to ${section.title}`} variant="ghost" size="sm" onPress={() => setEditing({ kind: 'item', item: null, categoryId: section.id })} />
            ) : null}
          </Card>
          );
        })
      )}

      {editing?.kind === 'item' ? (
        <ItemSheet restaurantId={restaurantId} categories={menu.categories} item={editing.item} categoryId={editing.categoryId} onClose={() => setEditing(null)} onDone={done} />
      ) : null}
      {editing?.kind === 'category' ? (
        <CategorySheet
          restaurantId={restaurantId}
          category={editing.category}
          nextDisplayOrder={menu.categories.length}
          onClose={() => setEditing(null)}
          onDone={done}
        />
      ) : null}
      <Dialog
        visible={deleting !== null}
        title={deleting ? t('Delete {name}?', { name: deleting.name }) : t('Delete this category?')}
        message={t('Only an empty category can be deleted. Move or archive its items first.')}
        confirmLabel={t('Delete category')}
        destructive
        onConfirm={() => {
          const category = deleting;
          setDeleting(null);
          if (category) void run(() => deleteCategory(category.id), t('Deleted the {name} category', { name: category.name }));
        }}
        onCancel={() => setDeleting(null)}
        testID="category-delete-dialog"
      />
    </>
  );
}

/** Whether the restaurant takes orders. Keyed by status, so a newer server state starts it fresh. */
function StatusCard({ restaurant }: { restaurant: Restaurant }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<OwnerRestaurantStatus | null>(null);
  const inFlight = useRef(false);
  const current = RESTAURANT_STATUS_META[restaurant.status];
  const editable = canOwnerChangeStatus(restaurant.status);

  async function change(status: OwnerRestaurantStatus) {
    if (inFlight.current || status === restaurant.status) return;
    inFlight.current = true;
    setPending(status);
    setError(null);
    try {
      await setRestaurantStatus(restaurant.id, status);
    } catch (caught) {
      setError(errorMessage(caught, t('Unable to change the status right now.')));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <Card testID="restaurant-availability">
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="defaultBold">{t('Taking orders')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {editable ? OWNER_STATUSES.find((s) => s.status === restaurant.status)?.hint : t('Suspended by an administrator. Contact support to be reinstated.')}
          </ThemedText>
        </View>
        <Badge label={current.label} tone={current.tone} testID="restaurant-status" />
      </View>
      {editable ? (
        <View style={styles.segments}>
          {OWNER_STATUSES.map((option) => {
            const selected = option.status === restaurant.status;
            return (
              <View key={option.status} style={styles.flex}>
                <AppButton
                  testID={`restaurant-status-${option.status}`}
                  title={option.label}
                  size="sm"
                  variant={selected ? 'primary' : 'secondary'}
                  loading={pending === option.status}
                  disabled={pending !== null}
                  accessibilityHint={selected ? t('Current status.') : t('Sets the restaurant to {status}.', { status: option.label })}
                  onPress={() => void change(option.status)}
                />
              </View>
            );
          })}
        </View>
      ) : null}
      {error ? <InlineAlert message={error} testID="restaurant-status-error" /> : null}
    </Card>
  );
}

/** One menu item with its availability toggle. Keyed by availability, so a newer state drops a stale error. */
function ItemRow({ restaurantId, item, first, onEdit }: { restaurantId: string; item: MenuItem; first: boolean; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await setItemAvailability(restaurantId, item.id, !item.available);
    } catch (caught) {
      setError(errorMessage(caught, t('Unable to update this item right now.')));
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.item, !first && styles.itemDivider]} testID={`item-${item.id}`} nativeID={`item-${item.id}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="default" numberOfLines={1} style={!item.available && styles.soldOutName}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMoney(item.price)}
          </ThemedText>
        </View>
        <Badge label={item.available ? 'Available' : 'Sold out'} tone={item.available ? 'success' : 'neutral'} testID={`item-${item.id}-availability`} />
        <AppButton
          testID={`item-${item.id}-toggle`}
          title={item.available ? t('Mark sold out') : t('Mark available')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          loading={isSaving}
          onPress={() => void toggle()}
        />
        <AppButton testID={`item-${item.id}-edit`} title={t('Edit')} variant="ghost" size="sm" fullWidth={false} onPress={onEdit} />
      </View>
      {error ? <InlineAlert message={error} testID={`item-${item.id}-error`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MAX_MENU_WIDTH,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  segments: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  item: {
    paddingVertical: Spacing.two,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.divider,
  },
  soldOutName: {
    color: BrandColors.textSecondary,
  },
});
