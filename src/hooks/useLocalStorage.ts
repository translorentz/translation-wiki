/**
 * useLocalStorage - React hook for persisted state in localStorage
 *
 * Provides a useState-like interface that automatically syncs with localStorage.
 * SSR-safe: initializes with defaultValue during server-side rendering.
 * Handles JSON serialization/deserialization automatically.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize with default value (SSR-safe)
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // localStorage not available or invalid JSON - use default
    }
    setIsHydrated(true);
  }, [key]);

  // Sync to localStorage when value changes (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage not available - silently fail
    }
  }, [key, value, isHydrated]);

  const setValueWrapper = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(prev)
          : newValue
      );
    },
    []
  );

  return [value, setValueWrapper];
}
