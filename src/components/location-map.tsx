/** Native builds have no map yet (the dashboard is web first): the address and coordinate fields are enough. */
export type LocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
  testID?: string;
};

export const MAP_AVAILABLE = false;

export function LocationMap(_props: LocationMapProps) {
  return null;
}
