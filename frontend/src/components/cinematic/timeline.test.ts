import { describe, expect, it } from 'vitest';
import { cameraAt, chapterAt, chapters, handshakeAt, screenFocus } from './timeline';

describe('document story timeline', () => {
  it('lands each navigation button on its chapter with a readable screen', () => {
    chapters.forEach((chapter, index) => {
      expect(chapterAt(chapter.at)).toBe(index);
      if (index > 0 && index < 5) expect(screenFocus(chapter.at)).toBe(1);
    });
  });
  it('keeps absolute sampling reversible and finite at every part of the camera route', () => {
    const samples = Array.from({ length: 501 }, (_, i) => i / 100);
    const forward = samples.map(cameraAt);
    expect(samples.slice().reverse().map(cameraAt).reverse()).toEqual(forward);
    forward.forEach((pose, i) => {
      expect([...pose.eye, ...pose.look, pose.fov].every(Number.isFinite)).toBe(true);
      if (i)
        expect(Math.hypot(...pose.eye.map((v, axis) => v - forward[i - 1].eye[axis]))).toBeLessThan(
          0.6,
        );
    });
  });
  it('keeps monitor controls inactive between workstations and during the finale', () => {
    [0, 0.5, 1.7, 2.7, 4.4, 5].forEach((phase) => expect(screenFocus(phase)).toBe(0));
    for (let phase = 0; phase < 5; phase += 0.01) {
      expect(screenFocus(phase)).toBeGreaterThanOrEqual(0);
      expect(screenFocus(phase)).toBeLessThanOrEqual(1);
    }
  });
  it('synchronizes both handshake clips with a monotonic bounded time and a held final pose', () => {
    expect(handshakeAt(0)).toBe(0);
    expect(handshakeAt(4.36)).toBe(0);
    expect(handshakeAt(5)).toBe(1);
    for (let phase = 4.36; phase < 5; phase += 0.01)
      expect(handshakeAt(phase + 0.01)).toBeGreaterThanOrEqual(handshakeAt(phase));
    expect(cameraAt(-20)).toEqual(cameraAt(0));
    expect(cameraAt(50)).toEqual(cameraAt(5));
  });
});
