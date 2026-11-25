import { useLayoutEffect, useRef } from 'react';

/* One underline per tab group that slides to the active tab instead of jumping.
   The tabs mark the active item with data-active="true"; the group renders an empty
   <span className="tab-indicator" />.
   Some groups switch routes (List / Kanban / Calendar), so the group remounts on every
   switch. Give such a group a `carryOver` name: its last position is kept for a moment
   after it unmounts, and the new underline slides from there. */

type Place = { x: number; y: number; w: number };
const lastPlace = new Map<string, Place & { leftAt: number }>();
const CARRY_OVER_MS = 1500;

export function useTabIndicator<T extends HTMLElement>(active: string, carryOver?: string) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const bar = root?.querySelector<HTMLElement>(':scope > .tab-indicator');
    if (!root || !bar) return;

    const measure = (): Place | null => {
      const tab = root.querySelector<HTMLElement>(':scope > [data-active="true"]');
      if (!tab) return null;
      return { x: tab.offsetLeft, y: tab.offsetTop + tab.offsetHeight - 2, w: tab.offsetWidth };
    };
    let target: Place | null = null;
    const put = (p: Place | null, animate: boolean) => {
      target = p;
      bar.style.transition = animate ? '' : 'none';
      bar.style.opacity = p ? '1' : '0';
      if (!p) return;
      bar.style.width = `${p.w}px`;
      bar.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };

    const next = measure();
    const fresh = !bar.dataset.placed;
    const previous = carryOver ? lastPlace.get(carryOver) : undefined;
    if (fresh && next && previous && performance.now() - previous.leftAt < CARRY_OVER_MS) {
      // Remounted right after a switch: start where the old underline was.
      put(previous, false);
      void bar.offsetWidth;
      put(next, true);
    } else {
      put(next, !fresh);
    }
    bar.dataset.placed = 'true';

    // Wrapping, fonts or a resized window move the tabs: follow without animating.
    // A resize that leaves the active tab where it was changes nothing, so it does
    // not cut a running slide short.
    const observer = new ResizeObserver(() => {
      const p = measure();
      if (p?.x !== target?.x || p?.y !== target?.y || p?.w !== target?.w) put(p, false);
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (carryOver && next) lastPlace.set(carryOver, { ...next, leftAt: performance.now() });
    };
  }, [active, carryOver]);

  return ref;
}
