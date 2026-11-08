import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius } from '@/constants/theme';
import { t } from '@/i18n';

import type { LocationMapProps } from './location-map';

export type { LocationMapProps } from './location-map';

/**
 * The location step's map (#28): Leaflet with OpenStreetMap tiles, no API key. Tapping the map drops the
 * pin; the pin follows the coordinate fields too. The admin app is to use the same library.
 */
export const MAP_AVAILABLE = true;

/** Where the map opens before a pin exists: central Cairo. */
const DEFAULT_CENTER: L.LatLngTuple = [30.0444, 31.2357];
/** About 10 cm: more is noise from a tap. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

export function LocationMap({ latitude, longitude, onPick, testID }: LocationMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.CircleMarker | null>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  const hasPin = latitude !== null && longitude !== null;

  useEffect(() => {
    if (!container.current) return undefined;
    const created = L.map(container.current, {
      center: hasPin ? [latitude, longitude] : DEFAULT_CENTER,
      zoom: hasPin ? 16 : 12,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(created);
    created.on('click', (event: L.LeafletMouseEvent) => pick.current(round(event.latlng.lat), round(event.latlng.lng)));
    map.current = created;
    return () => {
      created.remove();
      map.current = null;
      pin.current = null;
    };
    // The map is created once; the pin effect below follows the coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    if (latitude === null || longitude === null) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    const position: L.LatLngTuple = [latitude, longitude];
    if (pin.current) pin.current.setLatLng(position);
    else {
      pin.current = L.circleMarker(position, { radius: 10, color: BrandColors.onPrimary, weight: 3, fillColor: BrandColors.primary, fillOpacity: 1 }).addTo(current);
    }
    if (!current.getBounds().contains(position)) current.setView(position, Math.max(current.getZoom(), 15));
  }, [latitude, longitude]);

  return (
    <View style={styles.frame} testID={testID} nativeID={testID} accessibilityLabel={t('Map. Tap where the restaurant is to place the pin.')}>
      <div ref={container} style={{ height: '100%', width: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 300,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
});
