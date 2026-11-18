import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Solid } from '../workflow3d/OfficeModels';

function agreementTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1086;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fffdf7';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#4c5743';
  c.font = 'bold 24px Arial';
  c.fillText('TASKCONTROL', 72, 92);
  c.fillStyle = '#242a22';
  c.font = 'bold 42px Arial';
  c.fillText('Результат проекта', 72, 202);
  c.font = '24px Arial';
  c.fillStyle = '#68715f';
  c.fillText('Концепция корпоративного портала', 72, 254);
  c.fillRect(72, 303, 624, 2);
  ['01  Задача выполнена', '02  Документ согласован', '03  Результат передан'].forEach(
    (line, i) => {
      const y = 380 + i * 152;
      c.fillStyle = '#343d2e';
      c.font = 'bold 25px Arial';
      c.fillText(line, 72, y);
      c.fillStyle = '#b8bdae';
      [570, 624, 480].forEach((width, row) => c.fillRect(72, y + 29 + row * 18, width, 4));
    },
  );
  c.fillStyle = '#e2e8d8';
  c.fillRect(72, 844, 624, 66);
  c.fillStyle = '#526744';
  c.font = 'bold 25px Arial';
  c.fillText('СОГЛАСОВАНО', 251, 886);
  c.fillStyle = '#75806a';
  c.font = '18px Arial';
  c.fillText('Демонстрационный документ', 72, 1015);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function MeetingChair() {
  return (
    <group>
      <Solid
        size={[0.5, 0.075, 0.47]}
        position={[0, 0.46, 0]}
        color="#4b5146"
        radius={0.035}
        roughness={0.9}
      />
      <Solid
        size={[0.47, 0.38, 0.07]}
        position={[0, 0.71, -0.205]}
        rotation={[-0.12, 0, 0]}
        color="#4b5146"
        radius={0.03}
        roughness={0.9}
      />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Solid
            key={`${x}-${z}`}
            size={[0.026, 0.425, 0.026]}
            position={[x * 0.207, 0.22, z * 0.185]}
            rotation={[z * 0.06, 0, -x * 0.06]}
            color="#55584e"
            radius={0.005}
            metalness={0.75}
            roughness={0.32}
          />
        )),
      )}
    </group>
  );
}

function Cup() {
  return (
    <group>
      <mesh position={[0, 0.004, 0]} receiveShadow>
        <cylinderGeometry args={[0.068, 0.061, 0.008, 48]} />
        <meshStandardMaterial color="#ddd8cb" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.046, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.027, 0.076, 32]} />
        <meshStandardMaterial color="#eee8db" roughness={0.23} />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 32]} />
        <meshStandardMaterial color="#3d2d23" roughness={0.2} />
      </mesh>
      <mesh position={[0.036, 0.048, 0]}>
        <torusGeometry args={[0.023, 0.005, 10, 24]} />
        <meshStandardMaterial color="#eee8db" roughness={0.23} />
      </mesh>
    </group>
  );
}

/** Metre-scale props keep the contact above the tabletop and papers out of the arm path. */
export function MeetingTable({ wood }: { wood: Texture }) {
  const document = useMemo(() => agreementTexture(), []);
  const top = useMemo(() => new RoundedBoxGeometry(0.94, 0.045, 1.72, 4, 0.018), []);
  useEffect(
    () => () => {
      document.dispose();
      top.dispose();
    },
    [document, top],
  );
  return (
    <group position={[0, 0, -4.05]}>
      <Solid
        size={[2.8, 0.012, 2.65]}
        position={[0, 0.015, 0]}
        color="#c5c3ae"
        radius={0.004}
        roughness={1}
      />
      <mesh geometry={top} position={[0, 0.745, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} color="#b4a288" roughness={0.38} metalness={0.02} />
      </mesh>
      {[-0.64, 0.64].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <Solid
            size={[0.065, 0.7, 0.065]}
            position={[0, 0.375, 0]}
            color="#444c40"
            radius={0.009}
            metalness={0.6}
            roughness={0.3}
          />
          <Solid
            size={[0.77, 0.03, 0.1]}
            position={[0, 0.05, 0]}
            color="#444c40"
            radius={0.008}
            metalness={0.6}
            roughness={0.3}
          />
        </group>
      ))}
      <Solid
        size={[0.05, 0.045, 1.29]}
        position={[0, 0.31, 0]}
        color="#444c40"
        radius={0.006}
        metalness={0.6}
      />
      <group position={[0, 0.77, 0.36]} rotation={[0, -0.08, 0]}>
        <Solid size={[0.67, 0.006, 0.43]} color="#525b48" radius={0.002} roughness={0.93} />
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.165, 0.006, 0]}
            rotation={[0, (side * Math.PI) / 2, 0]}
          >
            <Solid size={[0.235, 0.004, 0.33]} color="#f1eddf" radius={0.001} />
            <mesh position={[0, 0.0025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[0.235, 0.33]} />
              <meshStandardMaterial map={document} roughness={0.94} />
            </mesh>
          </group>
        ))}
        <group position={[0.008, 0.014, 0.04]} rotation={[Math.PI / 2, 0, 0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.003, 0.003, 0.145, 12]} />
            <meshStandardMaterial color="#333c30" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.079, 0]}>
            <coneGeometry args={[0.003, 0.012, 12]} />
            <meshStandardMaterial color="#b6b39e" metalness={0.85} roughness={0.23} />
          </mesh>
        </group>
      </group>
      {[-0.32, 0.32].map((x) => (
        <group key={x} position={[x, 0.768, -0.6]}>
          <Cup />
        </group>
      ))}
      <group position={[-0.64, 0.025, 0]} rotation={[0, Math.PI / 2, 0]}>
        <MeetingChair />
      </group>
      <group position={[0.64, 0.025, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <MeetingChair />
      </group>
    </group>
  );
}
