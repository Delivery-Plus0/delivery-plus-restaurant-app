import { useSyncExternalStore } from 'react';

/** Which account action is open: the change-password sheet or the sign-out confirmation. */
export type AccountAction = 'password' | 'sign-out' | null;

let open: AccountAction = null;
const listeners = new Set<() => void>();

/** Opens an account action from anywhere (the desktop sidebar or the phone header). */
export function openAccountAction(action: AccountAction): void {
  open = action;
  listeners.forEach((listener) => listener());
}

export function useAccountAction(): AccountAction {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => open,
  );
}
