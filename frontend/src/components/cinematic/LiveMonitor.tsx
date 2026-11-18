import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, Mesh, NoBlending, Vector3 } from 'three';
import { Solid } from '../workflow3d/OfficeModels';
import { monitorAspect, monitorGeometry } from './monitorGeometry';
import { projectMonitor } from './monitorProjection';

/** The HTML interface remains on this physical screen at every camera distance.
 * The transparent depth-writing aperture preserves occlusion by people/furniture.
 */
export function LiveMonitor({
  x,
  elementRef,
}: {
  x: number;
  elementRef: RefObject<HTMLDivElement | null>;
}) {
  const surface = useRef<Mesh>(null);
  const projection = useMemo(
    () => ({
      clip: new Matrix4(),
      css: new Matrix4(),
      scratch: new Matrix4(),
      center: new Vector3(),
      normal: new Vector3(),
      toCamera: new Vector3(),
    }),
    [],
  );
  useFrame(({ camera, size }) => {
    const mesh = surface.current;
    const dom = elementRef.current;
    if (!mesh || !dom) return;
    camera.updateMatrixWorld();
    mesh.updateWorldMatrix(true, false);
    projection.center.setFromMatrixPosition(mesh.matrixWorld);
    projection.normal.set(0, 0, 1).transformDirection(mesh.matrixWorld);
    projection.toCamera.copy(camera.position).sub(projection.center);
    if (projection.normal.dot(projection.toCamera) <= 0.025) {
      dom.style.visibility = 'hidden';
      return;
    }
    const contentWidth = size.width;
    const contentHeight = contentWidth / monitorAspect;
    projection.clip.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    projectMonitor(
      projection.clip,
      mesh.matrixWorld,
      size.width,
      size.height,
      monitorGeometry.width,
      monitorGeometry.height,
      contentWidth,
      contentHeight,
      projection.css,
      projection.scratch,
    );
    dom.style.width = `${contentWidth}px`;
    dom.style.height = `${contentHeight}px`;
    dom.style.transform = `matrix3d(${projection.css.elements.join(',')})`;
    dom.style.visibility = 'visible';
  });
  return (
    <group
      position={[x, monitorGeometry.y, monitorGeometry.z]}
      rotation={[monitorGeometry.tilt, 0, 0]}
    >
      <Solid
        size={[monitorGeometry.width + 0.035, monitorGeometry.height + 0.035, 0.03]}
        position={[0, 0, -0.018]}
        color="#262c24"
        radius={0.009}
        roughness={0.4}
      />
      <mesh ref={surface}>
        <planeGeometry args={[monitorGeometry.width, monitorGeometry.height]} />
        <shaderMaterial
          vertexShader="void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
          fragmentShader="void main() { gl_FragColor = vec4(0.0); }"
          blending={NoBlending}
          depthTest
          depthWrite
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
