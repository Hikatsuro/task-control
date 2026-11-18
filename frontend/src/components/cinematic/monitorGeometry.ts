/** Shared by the physical monitor, DOM projection and camera close-up. Metres. */
export const monitorGeometry = {
  width: 0.568,
  height: 0.355,
  tilt: 0.08,
  y: 1.065,
  z: -0.35,
  x: [-1.95, 1.75] as const,
  fov: 35,
};

export const monitorAspect = monitorGeometry.width / monitorGeometry.height;

export function monitorCloseup(x: number) {
  const { height, fov, tilt, y, z } = monitorGeometry;
  const distance = height / (2 * Math.tan((fov * Math.PI) / 360));
  return {
    eye: [x, y - Math.sin(tilt) * distance, z + Math.cos(tilt) * distance] as [
      number,
      number,
      number,
    ],
    look: [x, y, z] as [number, number, number],
    fov,
  };
}
