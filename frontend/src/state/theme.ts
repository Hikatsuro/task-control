import { useSyncExternalStore } from 'react';
import { prefersLessMotion } from './motion';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'taskcontrol.theme.v1';

// Page background per theme, for the browser's own chrome (<meta name="theme-color">).
const canvasColor: Record<Theme, string> = { light: '#f5f6f0', dark: '#151813' };

const listeners = new Set<() => void>();

/* The chosen theme. Controls (the radio in the settings, menu labels) follow it at once;
   the page colours, set on <html>, may follow a moment later inside a view transition.
   The head bootstrap has already put the saved theme on <html> before this module runs. */
let chosen: Theme =
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light';

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function choose(theme: Theme) {
  chosen = theme;
  listeners.forEach((listener) => listener());
}

function paint(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvasColor[theme]);
}

function applyTheme(theme: Theme) {
  paint(theme);
  choose(theme);
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

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

/** Centre of the control that switched the theme: the new theme opens from there. */
export function themeOrigin(element: Element | null | undefined) {
  if (!element) return undefined;
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** A blocked or full storage must not prevent switching the current page.
 *  Where the browser supports view transitions the colours cross-fade; with an `origin`
 *  the new theme opens as a circle from that point. Reduced motion switches at once. */
export function setTheme(theme: Theme, origin?: { x: number; y: number }): boolean {
  let saved = true;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    saved = false;
  }
  const doc = document as ViewTransitionDocument;
  const root = document.documentElement;
  if (!doc.startViewTransition || prefersLessMotion() || chosen === theme) {
    applyTheme(theme);
    return saved;
  }
  // The choice shows at once, so a radio or a label never lags behind the click.
  choose(theme);
  if (origin) root.dataset.themeReveal = 'true';
  const transition = doc.startViewTransition(() => paint(theme));
  if (origin) {
    const { x, y } = origin;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 520,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        ),
      )
      .catch(() => undefined);
  }
  transition.finished
    .catch(() => undefined)
    .finally(() => {
      delete root.dataset.themeReveal;
      // A newer choice made during the transition wins.
      if (root.dataset.theme !== chosen) paint(chosen);
    });
  return saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return chosen;
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
