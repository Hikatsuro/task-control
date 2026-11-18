import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3, Vector4 } from 'three';
import { monitorAspect, monitorCloseup, monitorGeometry } from './monitorGeometry';
import { projectMonitor } from './monitorProjection';
import { cameraAt } from './timeline';

function projectionAt(phase: number, index = 0, width = 1152) {
  const height = width / monitorAspect;
  const pose = cameraAt(phase);
  const camera = new PerspectiveCamera(pose.fov, monitorAspect, 0.04, 50);
  camera.position.set(...pose.eye);
  camera.lookAt(...pose.look);
  camera.updateMatrixWorld();
  const world = new Matrix4().compose(
    new Vector3(monitorGeometry.x[index], monitorGeometry.y, monitorGeometry.z),
    new Quaternion().setFromEuler(new Euler(monitorGeometry.tilt, 0, 0)),
    new Vector3(1, 1, 1),
  );
  const css = projectMonitor(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    world,
    width,
    height,
    monitorGeometry.width,
    monitorGeometry.height,
    width,
    height,
    new Matrix4(),
    new Matrix4(),
  );
  return { css, camera, world, width, height };
}

describe('continuous document projection', () => {
  it('keeps all four DOM corners on the physical screen throughout both approaches and departures', () => {
    for (const width of [360, 850, 1152]) {
      for (const index of [0, 1]) {
        for (const phase of [
          0, 0.48, 0.75, 0.92, 1, 1.15, 1.42, 1.7, 1.92, 2.15, 2.5, 2.92, 3.15, 4.06,
        ]) {
          const p = projectionAt(phase, index, width);
          for (const [u, v] of [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ]) {
            const dom = new Vector4(u * p.width, v * p.height, 0, 1).applyMatrix4(p.css);
            const physical = new Vector3(
              (u - 0.5) * monitorGeometry.width,
              (0.5 - v) * monitorGeometry.height,
              0,
            )
              .applyMatrix4(p.world)
              .project(p.camera);
            expect(dom.x / dom.w).toBeCloseTo(((physical.x + 1) * p.width) / 2, 7);
            expect(dom.y / dom.w).toBeCloseTo(((1 - physical.y) * p.height) / 2, 7);
          }
        }
      }
    }
  });
  it('fills the viewport exactly at each reading position without a replacement overlay', () => {
    for (const [phase, index] of [
      [1.15, 0],
      [2.15, 1],
      [3.15, 0],
      [4, 0],
    ]) {
      const p = projectionAt(phase, index);
      const topLeft = new Vector4(0, 0, 0, 1).applyMatrix4(p.css);
      const bottomRight = new Vector4(p.width, p.height, 0, 1).applyMatrix4(p.css);
      expect(topLeft.x / topLeft.w).toBeCloseTo(0, 6);
      expect(topLeft.y / topLeft.w).toBeCloseTo(0, 6);
      expect(bottomRight.x / bottomRight.w).toBeCloseTo(p.width, 6);
      expect(bottomRight.y / bottomRight.w).toBeCloseTo(p.height, 6);
      expect(
        p.camera.position.distanceTo(new Vector3(...monitorCloseup(monitorGeometry.x[index]).look)),
      ).toBeGreaterThan(0.5);
    }
  });
  it('does not stop or jump at intermediate camera keys and eases into reading holds', () => {
    const delta = 0.00001;
    for (const key of [
      0.48, 0.78, 1, 1.4, 1.55, 1.7, 1.85, 2, 2.4, 2.55, 2.7, 2.85, 3, 4.06, 4.2, 4.36, 4.68,
    ]) {
      const before = cameraAt(key - delta).eye,
        center = cameraAt(key).eye,
        after = cameraAt(key + delta).eye;
      for (let axis = 0; axis < 3; axis++) {
        const entering = (center[axis] - before[axis]) / delta;
        const leaving = (after[axis] - center[axis]) / delta;
        expect(Math.abs(entering - leaving)).toBeLessThan(0.01);
      }
    }
  });
});
