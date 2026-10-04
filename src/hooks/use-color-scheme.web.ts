import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Keep the web default light until the native color scheme is available.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  return colorScheme ?? 'light';
}
