import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'taskcontrol.theme.v1';

export const themeColors = {
  light: { canvas: '#f5f6f0', accent: '#f45c28', processIdle: '#c2ccb8' },
  dark: { canvas: '#151813', accent: '#f28c64', processIdle: '#a2b397' },
} satisfies Record<Theme, { canvas: string; accent: string; processIdle: string }>;

const listeners = new Set<() => void>();

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme].canvas);
  listeners.forEach((listener) => listener());
}

/** Runs before React mounts. The head bootstrap also applies the saved theme before first paint. */
export function initializeTheme() {
  applyTheme(readSavedTheme());
  window.addEventListener('storage', (event) => {
    try {
      if (
        event.storageArea === localStorage &&
        (event.key === THEME_STORAGE_KEY || event.key === null)
      )
        applyTheme(readSavedTheme());
    } catch {
      // Storage restrictions do not prevent using the current in-memory theme.
    }
  });
}

/** A blocked or full storage must not prevent switching the current page. */
export function setTheme(theme: Theme): boolean {
  let saved = true;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    saved = false;
  }
  applyTheme(theme);
  return saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
