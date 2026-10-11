import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { BrandColors, IconSize } from '@/constants/theme';

const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  home: { ios: 'house', android: 'home', web: 'home' },
  orders: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  person: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  bag: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  checkAll: { ios: 'checkmark.circle', android: 'done_all', web: 'done_all' },
  cancel: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  store: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  delivery: { ios: 'box.truck', android: 'local_shipping', web: 'local_shipping' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  phone: { ios: 'phone', android: 'phone', web: 'phone' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  error: { ios: 'exclamationmark.circle', android: 'error_outline', web: 'error_outline' },
  offline: { ios: 'wifi.slash', android: 'cloud_off', web: 'cloud_off' },
  wallet: { ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  directions: { ios: 'arrow.triangle.turn.up.right.diamond', android: 'directions', web: 'directions' },
} as const satisfies Record<string, Extract<SymbolViewProps['name'], object>>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = IconSize.md, color = BrandColors.text }: IconProps) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} />;
}
