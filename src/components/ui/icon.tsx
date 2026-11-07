import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleUserRound,
  CircleX,
  Clock,
  House,
  LogOut,
  type LucideIcon,
  Mail,
  MapPin,
  Minus,
  Navigation,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  UtensilsCrossed,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react-native';
import { I18nManager, Platform, type ColorValue } from 'react-native';

import { BrandColors, IconSize } from '@/constants/theme';
import { isRTL, useLocale } from '@/i18n';

/**
 * Lucide icons (Redesign 2026): the same outline glyphs on iOS, Android and the web, matching the Figma
 * icon set. Screens use these names only, so swapping a glyph never touches a screen.
 */
const icons = {
  back: ArrowLeft,
  chevronRight: ChevronRight,
  home: House,
  orders: ReceiptText,
  bell: Bell,
  person: CircleUserRound,
  bag: ShoppingBag,
  search: Search,
  plus: Plus,
  minus: Minus,
  trash: Trash2,
  close: X,
  check: CircleCheck,
  checkAll: CheckCheck,
  cancel: CircleX,
  refresh: RefreshCw,
  store: Store,
  food: UtensilsCrossed,
  clock: Clock,
  location: MapPin,
  delivery: Truck,
  mail: Mail,
  phone: Phone,
  edit: Pencil,
  logout: LogOut,
  error: CircleAlert,
  offline: WifiOff,
  wallet: Wallet,
  directions: Navigation,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

/** Icons that point along the reading direction, so they flip in Arabic (right to left). */
const DIRECTIONAL: ReadonlySet<IconName> = new Set<IconName>(['back', 'chevronRight', 'logout']);

/**
 * Whether directional icons are drawn mirrored. It follows the layout direction actually in effect: on the
 * web it changes with the language at once; on iOS and Android only after the restart that flips the layout
 * (see device.ts). Lucide glyphs never mirror themselves, so every platform mirrors here.
 */
export function mirrorsDirectionalIcons(locale: Parameters<typeof isRTL>[0], platform: string = Platform.OS, nativeRTL = I18nManager.isRTL): boolean {
  return platform === 'web' ? isRTL(locale) : nativeRTL;
}

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = IconSize.md, color = BrandColors.text }: IconProps) {
  const locale = useLocale();
  const Glyph = icons[name];
  const mirrored = DIRECTIONAL.has(name) && mirrorsDirectionalIcons(locale);
  return <Glyph size={size} color={color as string} strokeWidth={2} style={mirrored ? MIRRORED : undefined} />;
}

const MIRRORED = { transform: [{ scaleX: -1 }] };
