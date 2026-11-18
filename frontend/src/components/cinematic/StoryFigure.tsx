import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { Group, Mesh, Vector3 } from 'three';
import { Solid } from '../workflow3d/OfficeModels';
import { handshakeAt, smooth, type Point } from './timeline';

const outfits = {
  manager: { jacket: '#39483d', skin: '#b98062', hair: '#3e3027' },
  employee: { jacket: '#975f45', skin: '#a77256', hair: '#382f29' },
  client: { jacket: '#beab8b', skin: '#cc9675', hair: '#624737' },
};
const up = new Vector3(0, 1, 0);

function aim(mesh: Mesh | null, from: Vector3, to: Vector3, direction: Vector3) {
  if (!mesh) return;
  direction.subVectors(to, from);
  mesh.position.copy(from).lerp(to, 0.5);
  mesh.scale.y = direction.length();
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
}

/** Original stylized figures keep the full story runnable from a clean checkout. */
export function StoryFigure({
  role,
  phase,
  meeting = false,
}: {
  role: keyof typeof outfits;
  phase: MotionValue<number>;
  meeting?: boolean;
}) {
  const palette = outfits[role];
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const upper = useRef<Mesh>(null);
  const lower = useRef<Mesh>(null);
  const hand = useRef<Mesh>(null);
  const pose = useRef({
    start: new Vector3(-0.17, 0.79, 0.28),
    contact: new Vector3(-0.013, 0.93, 0.616),
    wrist: new Vector3(),
    shoulder: new Vector3(),
    elbow: new Vector3(),
    direction: new Vector3(),
  });
  useFrame(() => {
    const value = phase.get();
    const time = meeting ? handshakeAt(value) : 0;
    const reach = smooth((time - (role === 'client' ? 0.23 : 0.18)) / 0.43);
    const shake = Math.sin(smooth((time - 0.69) / 0.26) * Math.PI * 2) * 0.016;
    const { start, contact, wrist, shoulder, elbow, direction } = pose.current;
    shoulder.set(-0.178, 1.03, 0.055 + reach * 0.105);
    elbow.set(-0.205 + reach * 0.082, 0.79 + reach * 0.04, 0.08 + reach * 0.23);
    wrist.copy(start).lerp(contact, reach);
    wrist.y += reach * shake;
    if (!meeting) wrist.y += Math.sin(value * 11) * 0.009;
    aim(upper.current, shoulder, elbow, direction);
    aim(lower.current, elbow, wrist, direction);
    if (hand.current) {
      hand.current.position.copy(wrist);
      hand.current.rotation.z = reach * 0.68;
    }
    if (torso.current) torso.current.rotation.x = reach * 0.195;
    if (head.current) head.current.rotation.x = 0.15 * (1 - smooth(time / 0.35));
  });
  return (
    <group>
      {[-0.095, 0.095].map((side) => (
        <group key={side}>
          <Solid position={[side, 0.48, 0.107]} size={[0.16, 0.16, 0.37]} color="#373a35" />
          <Solid position={[side, 0.255, 0.233]} size={[0.14, 0.43, 0.14]} color="#373a35" />
          <Solid position={[side, 0.054, 0.275]} size={[0.144, 0.074, 0.25]} color="#2c2926" />
        </group>
      ))}
      <group ref={torso} position={[0, 0.52, 0]}>
        <Solid
          position={[0, 0.3, 0.024]}
          size={[0.356, 0.535, 0.245]}
          color={palette.jacket}
          radius={0.08}
        />
        <Solid
          position={[0, 0.48, 0.15]}
          size={[0.083, 0.145, 0.014]}
          color="#e8dec9"
          radius={0.013}
        />
        <mesh position={[0, 0.577, 0.033]} castShadow>
          <cylinderGeometry args={[0.048, 0.058, 0.12, 16]} />
          <meshStandardMaterial color={palette.skin} roughness={0.77} />
        </mesh>
        <group ref={head} position={[0, 0.7, 0.038]}>
          <Ellipsoid scale={[0.099, 0.132, 0.102]} color={palette.skin} />
          <Ellipsoid
            position={[0, 0.046, -0.027]}
            scale={[0.104, 0.101, 0.097]}
            color={palette.hair}
          />
          {role === 'client' && (
            <Ellipsoid
              position={[0, -0.065, -0.07]}
              scale={[0.093, 0.101, 0.046]}
              color={palette.hair}
            />
          )}
          <Ellipsoid
            position={[0, -0.01, 0.096]}
            scale={[0.023, 0.03, 0.022]}
            color={palette.skin}
          />
          {[-0.035, 0.035].map((side) => (
            <Ellipsoid
              key={side}
              position={[side, 0.012, 0.093]}
              scale={[0.011, 0.006, 0.004]}
              color="#433129"
            />
          ))}
        </group>
        <Solid
          position={[0.179, 0.4, 0.087]}
          size={[0.098, 0.246, 0.104]}
          color={palette.jacket}
          rotation={[0.48, 0, 0.1]}
        />
      </group>
      <Solid position={[0.178, 0.789, 0.238]} size={[0.097, 0.089, 0.237]} color={palette.jacket} />
      <Ellipsoid
        position={[0.172, 0.787, 0.368]}
        scale={[0.037, 0.027, 0.046]}
        color={palette.skin}
      />
      <mesh ref={upper} castShadow>
        <cylinderGeometry args={[0.049, 0.058, 1, 16]} />
        <meshStandardMaterial color={palette.jacket} roughness={0.79} />
      </mesh>
      <mesh ref={lower} castShadow>
        <cylinderGeometry args={[0.04, 0.049, 1, 16]} />
        <meshStandardMaterial color={palette.jacket} roughness={0.79} />
      </mesh>
      <mesh ref={hand} scale={[0.038, 0.034, 0.05]} castShadow>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color={palette.skin} roughness={0.77} />
        <Ellipsoid position={[0.58, 0.58, -0.12]} scale={[0.39, 0.6, 0.38]} color={palette.skin} />
      </mesh>
    </group>
  );
}

function Ellipsoid({ position, scale, color }: { position?: Point; scale: Point; color: string }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.76} />
    </mesh>
  );
}
