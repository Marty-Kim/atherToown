'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (): (() => void) => () => {};

/**
 * zustand persist 는 클라이언트에서만 복원되므로,
 * 복원 전에는 loading 상태를 그려 hydration 불일치를 피한다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
