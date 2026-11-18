import { Matrix4 } from 'three';

/** One projective transform: CSS pixels -> monitor plane -> camera -> viewport pixels.
 * No second layout, screenshot or crossfade is used when the camera approaches.
 */
export function projectMonitor(
  clipFromWorld: Matrix4,
  worldFromMonitor: Matrix4,
  width: number,
  height: number,
  physicalWidth: number,
  physicalHeight: number,
  contentWidth: number,
  contentHeight: number,
  result: Matrix4,
  scratch: Matrix4,
) {
  scratch.set(
    physicalWidth / contentWidth,
    0,
    0,
    -physicalWidth / 2,
    0,
    -physicalHeight / contentHeight,
    0,
    physicalHeight / 2,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  );
  result.copy(worldFromMonitor).multiply(scratch).premultiply(clipFromWorld);
  scratch.set(width / 2, 0, 0, width / 2, 0, -height / 2, 0, height / 2, 0, 0, 1, 0, 0, 0, 0, 1);
  result.premultiply(scratch);
  // CSS depth is irrelevant: WebGL's depth buffer masks the actual visible pixels.
  const e = result.elements;
  const divisor = e[15];
  for (let i = 0; i < 16; i++) e[i] /= divisor;
  e[2] = e[6] = e[8] = e[9] = e[11] = e[14] = 0;
  e[10] = 1;
  return result;
}
