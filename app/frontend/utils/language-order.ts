import { useSyncExternalStore } from "react";
import type { TargetLanguage } from "./language-links";

const LANG_ORDER_STORAGE_KEY = "articleLangColumnOrder";

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function loadStoredOrder(
  defaults: readonly TargetLanguage[],
): TargetLanguage[] {
  try {
    const raw = localStorage.getItem(LANG_ORDER_STORAGE_KEY);
    if (!raw) return [...defaults];
    const stored = JSON.parse(raw);
    const sameSet =
      Array.isArray(stored) &&
      stored.length === defaults.length &&
      defaults.every((l) => stored.includes(l));
    return sameSet ? (stored as TargetLanguage[]) : [...defaults];
  } catch {
    return [...defaults];
  }
}

function saveStoredOrder(order: TargetLanguage[]) {
  try {
    localStorage.setItem(LANG_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    console.error("Failed to save language order to localStorage");
  }
}

let currentOrder: TargetLanguage[] | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setLanguageOrder(next: TargetLanguage[]) {
  currentOrder = next;
  saveStoredOrder(next);
  listeners.forEach((listener) => listener());
}

function useLanguageOrder(
  defaults: readonly TargetLanguage[],
): [TargetLanguage[], (next: TargetLanguage[]) => void] {
  if (currentOrder === null) {
    currentOrder = loadStoredOrder(defaults);
  }
  const getSnapshot = () => currentOrder as TargetLanguage[];
  const order = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [order, setLanguageOrder];
}

export {
  LANG_ORDER_STORAGE_KEY,
  reorder,
  loadStoredOrder,
  saveStoredOrder,
  useLanguageOrder,
};
