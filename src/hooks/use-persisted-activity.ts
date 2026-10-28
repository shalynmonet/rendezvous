import { useState, type Dispatch, type SetStateAction } from "react";
import { setState, storeSnapshot } from "@/lib/store";

export function usePersistedActivity<T>(connectionId: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const saved = storeSnapshot().ruelette?.[connectionId] as Record<string, unknown> | undefined;
  const [value, set] = useState<T>(() => (saved?.[field] as T | undefined) ?? initial);
  const update: Dispatch<SetStateAction<T>> = (next) => {
    set((previous) => {
      const result = typeof next === "function" ? (next as (prev: T) => T)(previous) : next;
      // Defer store notification until after React's updater completes.
      queueMicrotask(() => setState((s) => ({ ...s, ruelette: { ...s.ruelette, [connectionId]: { ...(s.ruelette?.[connectionId] as Record<string, unknown> | undefined), [field]: result } } })));
      return result;
    });
  };
  return [value, update];
}