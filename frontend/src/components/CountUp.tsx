import { useEffect, useRef, useState } from 'react';
import { prefersLessMotion } from '../state/motion';

/* A figure that counts up from zero once, when it first appears (about 0.7 s).
   Later changes, for example a new report period, show the new value at once.
   Screen readers get the final value only. */

const DURATION = 700;

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState<number | null>(() =>
    value > 0 && !prefersLessMotion() ? 0 : null,
  );
  const target = useRef(value);
  useEffect(() => {
    target.current = value;
  });
  const counting = shown !== null;

  useEffect(() => {
    if (!counting) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / DURATION);
      if (t >= 1) {
        setShown(null);
        return;
      }
      setShown(Math.round(target.current * (1 - Math.pow(1 - t, 3))));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [counting]);

  if (shown === null)
    return (
      <>
        {value}
        {suffix}
      </>
    );
  return (
    <>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </>
  );
}
