import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Theme } from '../../state/theme';
import { Solid } from './OfficeModels';

/** Authored material texture: subtle oak fibres, independent of external CDNs. */
function createOakTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#b69a75';
  context.fillRect(0, 0, 512, 256);
  let seed = 71;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let n = 0; n < 380; n++) {
    const y = random() * 256;
    context.strokeStyle = `rgba(${random() > 0.5 ? '78,52,28' : '233,207,165'},${0.03 + random() * 0.13})`;
    context.lineWidth = 0.35 + random() * 1.2;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(
      180,
      y + random() * 12 - 6,
      330,
      y - random() * 10,
      512,
      y + random() * 7,
    );
    context.stroke();
  }
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  result.wrapS = result.wrapT = RepeatWrapping;
  result.anisotropy = 8;
  return result;
}

function useOakTexture() {
  const texture = useMemo(() => createOakTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function OfficeChair() {
  return (
    <group>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.035, 0.32, 16]} />
        <meshStandardMaterial color="#a8aaa6" metalness={0.85} roughness={0.25} />
      </mesh>
      {[0, 1, 2, 3, 4].map((n) => (
        <group key={n} rotation={[0, (n * Math.PI * 2) / 5, 0]}>
          <Solid
            size={[0.037, 0.035, 0.32]}
            position={[0, 0.12, 0.12]}
            color="#373a36"
            radius={0.014}
            metalness={0.4}
          />
          <mesh position={[0, 0.06, 0.27]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.043, 0.043, 0.055, 16]} />
            <meshStandardMaterial color="#20231f" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <Solid
        size={[0.49, 0.07, 0.46]}
        position={[0, 0.46, 0.015]}
        color="#41483f"
        radius={0.045}
        roughness={0.98}
      />
      <Solid
        size={[0.42, 0.48, 0.06]}
        position={[0, 0.77, -0.19]}
        rotation={[-0.1, 0, 0]}
        color="#343b32"
        radius={0.05}
        roughness={1}
      />
      <Solid
        size={[0.055, 0.36, 0.06]}
        position={[0, 0.61, -0.23]}
        color="#20251f"
        radius={0.015}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Solid
            size={[0.025, 0.22, 0.03]}
            position={[side * 0.27, 0.57, 0.01]}
            color="#3d423a"
            radius={0.008}
          />
          <Solid
            size={[0.065, 0.035, 0.25]}
            position={[side * 0.27, 0.69, 0.025]}
            color="#282e26"
            radius={0.017}
          />
        </group>
      ))}
      <Solid
        size={[0.27, 0.12, 0.055]}
        position={[0, 1.08, -0.23]}
        color="#343b32"
        radius={0.035}
      />
    </group>
  );
}

function CoffeeCup() {
  return (
    <group>
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.037, 0.03, 0.09, 24]} />
        <meshStandardMaterial color="#ded6c5" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.091, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.031, 24]} />
        <meshStandardMaterial color="#3a2319" roughness={0.28} />
      </mesh>
      <mesh position={[0.037, 0.052, 0]}>
        <torusGeometry args={[0.026, 0.007, 8, 18]} />
        <meshStandardMaterial color="#ded6c5" roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Workstation({
  theme,
  manager,
  stage,
  rework,
}: {
  theme: Theme;
  manager: boolean;
  stage: number;
  rework: boolean;
}) {
  const wood = useOakTexture();
  const working = manager ? stage !== 1 && !rework : stage === 1 || rework;
  return (
    <group>
      <mesh position={[0, 0.745, 0.13]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.035, 0.8]} />
        <meshStandardMaterial map={wood} roughness={0.55} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Solid
            size={[0.045, 0.7, 0.045]}
            position={[side * 0.71, 0.37, -0.16]}
            color="#454a43"
            radius={0.007}
            metalness={0.45}
            roughness={0.4}
          />
          <Solid
            size={[0.045, 0.7, 0.045]}
            position={[side * 0.71, 0.37, 0.42]}
            color="#454a43"
            radius={0.007}
            metalness={0.45}
            roughness={0.4}
          />
          <Solid
            size={[0.05, 0.035, 0.65]}
            position={[side * 0.71, 0.04, 0.13]}
            color="#454a43"
            radius={0.007}
          />
        </group>
      ))}
      <Solid size={[1.38, 0.055, 0.03]} position={[0, 0.62, 0.43]} color="#333b31" radius={0.005} />
      <group position={[0.1, 0.77, 0.37]}>
        <Solid size={[0.23, 0.012, 0.17]} color="#3b4039" radius={0.009} metalness={0.55} />
        <Solid
          size={[0.027, 0.18, 0.025]}
          position={[0, 0.09, 0.025]}
          color="#60665c"
          radius={0.007}
          metalness={0.65}
        />
        <group position={[0, 0.29, 0]} rotation={[-0.08, 0, 0]}>
          <Solid size={[0.6, 0.35, 0.026]} color="#292e27" radius={0.012} roughness={0.45} />
          <mesh position={[0, 0.005, -0.014]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.568, 0.315]} />
            <meshStandardMaterial
              color={theme === 'dark' ? '#53664c' : '#c8d0bc'}
              emissive={working ? '#94ae82' : '#607254'}
              emissiveIntensity={working ? 0.22 : 0.06}
              roughness={0.4}
            />
          </mesh>
          {[0, 1, 2].map((n) => (
            <Solid
              key={n}
              size={[0.33, 0.022, 0.002]}
              position={[0.035, 0.085 - n * 0.055, -0.016]}
              color={n === 0 && working ? '#df8d67' : '#8c9b7f'}
              radius={0.003}
            />
          ))}
          <Solid
            size={[0.042, 0.006, 0.002]}
            position={[0, -0.158, 0.015]}
            color="#747d6c"
            radius={0.001}
          />
        </group>
      </group>
      <Solid
        size={[0.42, 0.018, 0.145]}
        position={[0, 0.775, -0.16]}
        color="#41473d"
        radius={0.01}
      />
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 12 }, (_, col) => (
          <Solid
            key={`${row}-${col}`}
            size={[0.025, 0.005, 0.028]}
            position={[-0.18 + col * 0.032, 0.787, -0.204 + row * 0.041]}
            color="#c2c6ba"
            radius={0.002}
          />
        )),
      )}
      <mesh position={[0.36, 0.79, -0.14]} scale={[1, 0.55, 1.5]} castShadow>
        <sphereGeometry args={[0.035, 20, 12]} />
        <meshStandardMaterial color="#3d4538" roughness={0.6} />
      </mesh>
      <group position={[-0.61, 0.765, 0.26]}>
        <CoffeeCup />
      </group>
      <Solid
        size={[0.2, 0.025, 0.27]}
        position={[0.6, 0.778, 0.2]}
        rotation={[0, -0.1, 0]}
        color={manager ? '#67795a' : '#b98463'}
        radius={0.005}
      />
      <Solid
        size={[0.18, 0.012, 0.245]}
        position={[0.6, 0.791, 0.2]}
        rotation={[0, -0.1, 0]}
        color="#dcd6c7"
        radius={0.002}
      />
      <Solid
        size={[0.008, 0.008, 0.18]}
        position={[0.62, 0.803, 0.2]}
        rotation={[0, -0.25, 0]}
        color="#3d4439"
        radius={0.002}
        metalness={0.3}
      />
      <Solid
        size={[0.38, 0.57, 0.46]}
        position={[0.48, 0.29, 0.22]}
        color="#b2ab9a"
        radius={0.012}
      />
      {[0.17, 0.36, 0.48].map((y) => (
        <Solid
          key={y}
          size={[0.33, 0.012, 0.008]}
          position={[0.48, y, -0.016]}
          color="#7e8275"
          radius={0.003}
        />
      ))}
    </group>
  );
}

export function OfficeRoom({ theme }: { theme: Theme }) {
  const dark = theme === 'dark';
  const wood = useOakTexture();
  return (
    <group>
      <Solid
        size={[7.3, 0.12, 4.7]}
        position={[0, -0.075, 0]}
        color={dark ? '#4a463c' : '#a69880'}
        radius={0.025}
      />
      {Array.from({ length: 18 }, (_, n) => (
        <mesh key={n} position={[-3.45 + n * 0.406, -0.009, 0]} receiveShadow>
          <boxGeometry args={[0.401, 0.025, 4.65]} />
          <meshStandardMaterial
            map={wood}
            color={dark ? '#9a8c75' : n % 3 === 0 ? '#d1c4ac' : '#ddd3be'}
            roughness={0.76}
          />
        </mesh>
      ))}
      <Solid
        size={[5.9, 0.015, 2.45]}
        position={[0, 0.015, 0.18]}
        color={dark ? '#545d4b' : '#9a9f89'}
        radius={0.02}
        roughness={1}
      />
      <Solid
        size={[7.3, 2.55, 0.1]}
        position={[0, 1.25, -2.28]}
        color={dark ? '#595e50' : '#d1cfc1'}
        radius={0.005}
        roughness={1}
      />
      <Solid
        size={[7.24, 0.065, 0.025]}
        position={[0, 0.045, -2.21]}
        color="#8a8b7d"
        radius={0.003}
      />
      <group position={[0.75, 1.55, -2.215]}>
        <mesh>
          <planeGeometry args={[4.7, 1.66]} />
          <meshBasicMaterial color={dark ? '#64776d' : '#c1d2ce'} />
        </mesh>
        {[-2.36, -0.79, 0.79, 2.36].map((x) => (
          <Solid
            key={x}
            size={[0.035, 1.72, 0.07]}
            position={[x, 0, 0.035]}
            color="#626c63"
            radius={0.004}
            metalness={0.3}
          />
        ))}
        {[-0.85, 0.85].map((y) => (
          <Solid
            key={y}
            size={[4.76, 0.035, 0.07]}
            position={[0, y, 0.035]}
            color="#626c63"
            radius={0.004}
            metalness={0.3}
          />
        ))}
        <Solid
          size={[4.88, 0.045, 0.24]}
          position={[0, -0.88, 0.07]}
          color="#b4afa0"
          radius={0.005}
        />
        <mesh position={[0.18, 0.13, 0.05]}>
          <planeGeometry args={[0.32, 1.32]} />
          <meshBasicMaterial color="#f3f1de" transparent opacity={0.13} depthWrite={false} />
        </mesh>
      </group>
      <group position={[-2.65, 0.01, -1.83]}>
        <Solid size={[1.25, 0.73, 0.42]} position={[0, 0.365, 0]} color="#787b69" radius={0.008} />
        <mesh position={[0, 0.74, 0]} castShadow>
          <boxGeometry args={[1.29, 0.025, 0.45]} />
          <meshStandardMaterial map={wood} roughness={0.6} />
        </mesh>
        {[-0.31, 0.31].map((x) => (
          <group key={x}>
            <Solid
              size={[0.606, 0.68, 0.02]}
              position={[x, 0.365, 0.218]}
              color="#8c8e7b"
              radius={0.004}
            />
            <Solid
              size={[0.013, 0.11, 0.02]}
              position={[x + 0.21, 0.42, 0.235]}
              color="#434a3d"
              radius={0.004}
              metalness={0.6}
            />
          </group>
        ))}
        {['#6e735f', '#c8b697', '#9b6c50', '#d1c8b4', '#56644f'].map((color, n) => (
          <Solid
            key={color}
            size={[0.055, 0.22 + (n % 2) * 0.04, 0.18]}
            position={[-0.42 + n * 0.065, 0.87, 0.01]}
            rotation={[0, 0, n === 4 ? -0.12 : 0]}
            color={color}
            radius={0.002}
          />
        ))}
      </group>
      <group position={[0, 0.03, -0.74]}>
        <mesh position={[0, 0.73, 0]}>
          <boxGeometry args={[0.014, 1.4, 1.12]} />
          <meshPhysicalMaterial
            color="#bbc8b6"
            transparent
            opacity={0.15}
            roughness={0.1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
        {[-0.56, 0.56].map((z) => (
          <Solid
            key={z}
            size={[0.025, 1.45, 0.025]}
            position={[0, 0.73, z]}
            color="#788270"
            radius={0.003}
            metalness={0.5}
          />
        ))}
        <Solid
          size={[0.025, 0.025, 1.15]}
          position={[0, 1.45, 0]}
          color="#788270"
          radius={0.003}
          metalness={0.5}
        />
      </group>
    </group>
  );
}
