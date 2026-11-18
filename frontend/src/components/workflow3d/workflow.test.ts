import { describe, expect, it } from 'vitest';
import { cardPosition, stageForPhase } from './workflow';

describe('continuous task route', () => {
  it('keeps every handoff continuous when crossing stage boundaries', () => {
    for (const boundary of [1, 2]) {
      const before = cardPosition(boundary - 0.0001, false);
      const after = cardPosition(boundary + 0.0001, false);
      expect(Math.hypot(...before.map((v, i) => v - after[i]))).toBeLessThan(0.001);
    }
  });
  it('returns the result to the employee without introducing a fifth status', () => {
    expect(cardPosition(2, true)).toEqual(cardPosition(1, false));
    expect(stageForPhase(-1)).toBe(0);
    expect(stageForPhase(8)).toBe(3);
  });
  it('keeps the moving card above the workstations throughout the main route', () => {
    for (let phase = 0; phase <= 3; phase += 0.05) {
      const [x, y, z] = cardPosition(phase, false);
      expect([x, y, z].every(Number.isFinite)).toBe(true);
      // Adult seated heads are ~1.45 m high; the 0.78 m card clears them.
      expect(y - 0.39).toBeGreaterThan(1.55);
      expect(Math.abs(x)).toBeLessThan(3);
    }
  });
});
