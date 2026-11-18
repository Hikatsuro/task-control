import { useEffect, useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Theme } from '../../state/theme';
import type { Point3 } from './workflow';

type SolidProps = Omit<ThreeElements['mesh'], 'args'> & {
  size: Point3;
  color: string;
  radius?: number;
  metalness?: number;
  roughness?: number;
};

export function Solid({
  size,
  color,
  radius = 0.04,
  metalness = 0,
  roughness = 0.65,
  ...props
}: SolidProps) {
  const [width, height, depth] = size;
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        width,
        height,
        depth,
        2,
        Math.min(radius, width / 3, height / 3, depth / 3),
      ),
    [width, height, depth, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow {...props}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

function Limb({
  from,
  to,
  radius,
  color,
}: {
  from: Point3;
  to: Point3;
  radius: number;
  color: string;
}) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from),
      b = new Vector3(...to);
    const direction = b.clone().sub(a);
    return {
      midpoint: a.clone().add(b).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 4, 12]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

export function Plant({ position, size = 1 }: { position: Point3; size?: number }) {
  const leaf = useMemo(() => {
    const geometry = new BufferGeometry();
    const vertices: number[] = [],
      indices: number[] = [];
    for (let row = 0; row <= 8; row++) {
      const t = row / 8;
      const width = Math.sin(t * Math.PI) * 0.068;
      for (const side of [-1, 0, 1])
        vertices.push(
          t * 0.25,
          Math.sin(t * Math.PI) * 0.035 - Math.abs(side) * 0.014,
          side * width,
        );
    }
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 2; col++) {
        const a = row * 3 + col;
        indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => leaf.dispose(), [leaf]);
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.36, 32]} />
        <meshStandardMaterial color="#aaa58f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.363, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.186, 24]} />
        <meshStandardMaterial color="#39382a" roughness={1} />
      </mesh>
      <Limb from={[0, 0.3, 0]} to={[0.03, 1.38, 0]} radius={0.012} color="#736c4c" />
      {Array.from({ length: 16 }, (_, n) => (
        <group key={n} rotation={[0, n * 2.4, 0]} position={[0, 0.63 + n * 0.045, 0]}>
          <Limb from={[0, 0, 0]} to={[0.14, 0.055, 0]} radius={0.004} color="#657342" />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={leaf}
              position={[0.12, 0.055, 0]}
              rotation={[side * 0.3, side * 0.55, n % 2 ? 0.2 : -0.13]}
              castShadow
            >
              <meshStandardMaterial
                color={n % 3 === 0 ? '#536d36' : '#3c592c'}
                roughness={0.65}
                side={DoubleSide}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function ticketTexture(theme: Theme, stage: number, rework: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  const dark = theme === 'dark';
  ctx.fillStyle = dark ? '#31392b' : '#fffdf7';
  ctx.fillRect(0, 0, 768, 600);
  ctx.fillStyle = rework ? '#bd7555' : stage === 3 ? '#799e70' : '#ed895d';
  ctx.fillRect(0, 0, 768, 22);
  ctx.fillStyle = dark ? '#c3cbb9' : '#616a56';
  ctx.font = '500 31px "Roboto Variable", Arial';
  ctx.fillText('TASKCONTROL / TC–024', 48, 89);
  ctx.fillStyle = dark ? '#f0f2e9' : '#283022';
  ctx.font = '700 57px "Roboto Condensed Variable", Arial';
  ctx.fillText('Макет проекта', 48, 174);
  ctx.font = '400 30px "Roboto Variable", Arial';
  ctx.fillStyle = dark ? '#b5c0a7' : '#6a735e';
  ctx.fillText(rework ? 'Добавить проверку полей' : 'Описание · исполнитель · срок', 48, 227);
  for (let n = 0; n < 3; n++) {
    const done = stage > 0 && (stage === 3 || n < 2) && !rework;
    ctx.fillStyle = done ? '#88a778' : dark ? '#55634a' : '#d5ddca';
    ctx.beginPath();
    ctx.roundRect(48, 285 + n * 58, 25, 25, 6);
    ctx.fill();
    ctx.fillStyle = dark ? '#acb99c' : '#c4cdb7';
    ctx.beginPath();
    ctx.roundRect(94, 291 + n * 58, n === 2 ? 330 : 480, 12, 5);
    ctx.fill();
  }
  ctx.fillStyle = rework ? '#d69a7f' : stage === 3 ? '#99c18d' : dark ? '#f3a27d' : '#a44826';
  ctx.font = '600 34px "Roboto Variable", Arial';
  ctx.fillText(
    rework ? 'НА ДОРАБОТКЕ' : ['НОВАЯ', 'В РАБОТЕ', 'НА ПРОВЕРКЕ', 'ВЫПОЛНЕНА'][stage],
    48,
    547,
  );
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function TaskTicket({
  theme,
  stage,
  rework,
}: {
  theme: Theme;
  stage: number;
  rework: boolean;
}) {
  const texture = useMemo(() => ticketTexture(theme, stage, rework), [theme, stage, rework]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <Solid
        size={[1.68, 1.34, 0.08]}
        color={theme === 'dark' ? '#31392b' : '#fffdf7'}
        radius={0.035}
      />
      <mesh position={[0, 0, 0.046]}>
        <planeGeometry args={[1.59, 1.24]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {[1, 2].map((n) => (
        <Solid
          key={n}
          size={[1.62, 1.28, 0.025]}
          color={theme === 'dark' ? '#55604b' : '#d5d8ca'}
          position={[n * 0.025, -n * 0.025, -0.04 - n * 0.025]}
          radius={0.02}
        />
      ))}
      {stage === 3 && !rework && (
        <group position={[0.81, 0.58, 0.08]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.07, 40]} />
            <meshStandardMaterial color="#86ab76" roughness={0.45} />
          </mesh>
          <Solid
            size={[0.08, 0.17, 0.035]}
            color="#f1f5e9"
            position={[-0.065, -0.02, 0.06]}
            rotation={[0, 0, 0.7]}
            radius={0.015}
          />
          <Solid
            size={[0.08, 0.29, 0.035]}
            color="#f1f5e9"
            position={[0.05, 0.025, 0.06]}
            rotation={[0, 0, -0.68]}
            radius={0.015}
          />
        </group>
      )}
    </group>
  );
}

export function FloorLabel({
  text,
  position,
  theme,
}: {
  text: string;
  position: Point3;
  theme: Theme;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme === 'dark' ? '#e7eddc' : '#46503d';
    ctx.font = '600 49px "Roboto Condensed Variable", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 384, 82);
    const value = new CanvasTexture(canvas);
    value.colorSpace = SRGBColorSpace;
    return value;
  }, [text, theme]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.7, 0.45]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
