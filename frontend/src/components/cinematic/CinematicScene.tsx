import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  CanvasTexture,
  Group,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Theme } from '../../state/theme';
import { Solid, Plant } from '../workflow3d/OfficeModels';
import { OfficeChair, Workstation } from '../workflow3d/OfficeInterior';
import { RealisticPerson } from '../workflow3d/RealisticPerson';
import { cameraAt, handshakeAt } from './timeline';
import { MeetingTable } from './MeetingTable';
import { StoryLighting } from './StoryLighting';
import { LiveMonitor } from './LiveMonitor';
import { monitorGeometry } from './monitorGeometry';
import { StoryFigure } from './StoryFigure';

declare const __HAS_LOCAL_PEOPLE__: boolean;

type Props = {
  phase: MotionValue<number>;
  chapter: number;
  theme: Theme;
  active: boolean;
  reduced: boolean;
  onReady: () => void;
  monitorElements: readonly [RefObject<HTMLDivElement | null>, RefObject<HTMLDivElement | null>];
};

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b59b79';
  ctx.fillRect(0, 0, 1024, 256);
  let seed = 82;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 750; i++) {
    const y = random() * 256;
    ctx.strokeStyle = `rgba(${random() > 0.4 ? '64,43,23' : '245,228,194'},${0.02 + random() * 0.1})`;
    ctx.lineWidth = 0.3 + random();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(300, y + random() * 5, 700, y - random() * 5, 1024, y + random() * 2);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function Interior({ theme }: { theme: Theme }) {
  const dark = theme === 'dark';
  const wood = useMemo(() => woodTexture(), []);
  useEffect(() => () => wood.dispose(), [wood]);
  return (
    <group>
      <Solid
        size={[11.8, 0.14, 9.4]}
        position={[0, -0.09, -1.65]}
        color={dark ? '#403d32' : '#b1a38d'}
        radius={0.03}
      />
      {Array.from({ length: 29 }, (_, i) => (
        <mesh key={i} position={[-5.6 + i * 0.4, -0.01, -1.65]} receiveShadow>
          <boxGeometry args={[0.396, 0.025, 9.3]} />
          <meshStandardMaterial
            map={wood}
            color={i % 3 === 0 ? '#d2bd98' : '#e1ccaa'}
            roughness={0.64}
          />
        </mesh>
      ))}
      <Solid
        size={[11.8, 3.15, 0.12]}
        position={[0, 1.5, -6.3]}
        color={dark ? '#626553' : '#dddace'}
        radius={0.01}
        roughness={0.9}
      />
      <group position={[0.7, 1.85, -6.22]}>
        <mesh>
          <planeGeometry args={[8.5, 2.15]} />
          <meshBasicMaterial color={dark ? '#6a8587' : '#c9dde0'} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[-4 + i * 0.7, -0.6 + (i % 3) * 0.18, 0.012]}>
            <planeGeometry args={[0.45, 0.9 + (i % 3) * 0.3]} />
            <meshBasicMaterial color={dark ? '#6a7978' : '#b2c5c5'} />
          </mesh>
        ))}
        {[-4.25, -2.12, 0, 2.12, 4.25].map((x) => (
          <Solid
            key={x}
            size={[0.045, 2.25, 0.09]}
            position={[x, 0, 0.06]}
            color="#727c70"
            radius={0.003}
            metalness={0.5}
          />
        ))}
        {[-1.1, 1.1].map((y) => (
          <Solid
            key={y}
            size={[8.55, 0.045, 0.1]}
            position={[0, y, 0.06]}
            color="#727c70"
            radius={0.003}
            metalness={0.5}
          />
        ))}
        <Solid size={[8.8, 0.04, 0.3]} position={[0, -1.12, 0.1]} color="#b1ad9d" radius={0.005} />
      </group>
      <Solid
        size={[0.1, 3.15, 6.3]}
        position={[-5.85, 1.5, -3.1]}
        color={dark ? '#595d4c' : '#d1ccbd'}
        radius={0.01}
      />
      {Array.from({ length: 18 }, (_, i) => (
        <Solid
          key={i}
          size={[0.055, 2.7, 0.035]}
          position={[-5.77, 1.5, -5.75 + i * 0.2]}
          color="#917e61"
          radius={0.004}
        />
      ))}
      <Solid size={[1.7, 0.7, 0.42]} position={[-4.4, 0.35, -4.7]} color="#79806c" radius={0.02} />
      <mesh position={[-4.4, 0.72, -4.7]} castShadow>
        <boxGeometry args={[1.75, 0.035, 0.46]} />
        <meshStandardMaterial map={wood} roughness={0.4} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <Solid
          key={i}
          size={[0.045, 0.25 + (i % 3) * 0.025, 0.19]}
          position={[-4.9 + i * 0.06, 0.85, -4.7]}
          color={['#434d3b', '#ba9f78', '#d6cdb8'][i % 3]}
          radius={0.002}
        />
      ))}
      <MeetingTable wood={wood} />
      <group position={[3.7, 0, -4.4]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.72, 0.045, 64]} />
          <meshStandardMaterial map={wood} roughness={0.46} />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.1, 0.73, 24]} />
          <meshStandardMaterial color="#676b5b" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.35, 0.4, 0.03, 32]} />
          <meshStandardMaterial color="#676b5b" metalness={0.4} />
        </mesh>
        <group position={[0.95, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <OfficeChair />
        </group>
        <group position={[-0.95, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <OfficeChair />
        </group>
      </group>
      <Plant position={[-4.9, 0, -2.5]} size={1.4} />
      <Plant position={[4.8, 0, -5.7]} size={1.55} />
      <Plant position={[4.2, 0, 0.6]} size={0.9} />
      <group position={[0, 0, -1.7]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[7.7, 2.2, 0.018]} />
          <meshPhysicalMaterial
            color="#dbe4d4"
            transparent
            opacity={0.1}
            roughness={0.12}
            depthWrite={false}
          />
        </mesh>
        {[-3.85, 3.85].map((x) => (
          <Solid
            key={x}
            size={[0.035, 2.25, 0.035]}
            position={[x, 1.12, 0]}
            color="#84907b"
            radius={0.005}
            metalness={0.65}
          />
        ))}
      </group>
    </group>
  );
}

function HandshakePerson({
  kind,
  phase,
}: {
  kind: 'eric' | 'claudia';
  phase: MotionValue<number>;
}) {
  const asset = useLoader(GLTFLoader, `/models/people-local/${kind}-handshake.glb`);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    asset.scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        for (const texture of [material.map, material.normalMap]) {
          if (texture && texture.anisotropy !== anisotropy) {
            texture.anisotropy = anisotropy;
            texture.needsUpdate = true;
          }
        }
      }
    });
  }, [asset, gl]);
  const actor = useMemo(() => {
    const object = clone(asset.scene);
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const mixer = new AnimationMixer(object);
    const clip = asset.animations[0];
    if (!clip) throw new Error(`Handshake animation is missing: ${kind}`);
    return { object, mixer, clip };
  }, [asset, kind]);
  useEffect(() => {
    const action = actor.mixer.clipAction(actor.clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();
    return () => {
      actor.mixer.stopAllAction();
      actor.mixer.uncacheRoot(actor.object);
    };
  }, [actor]);
  useFrame(() => {
    actor.mixer.setTime(
      Math.min(actor.clip.duration - 0.001, handshakeAt(phase.get()) * actor.clip.duration),
    );
  });
  return <primitive object={actor.object} dispose={null} />;
}

function World({ phase, chapter, theme, active, reduced, onReady, monitorElements }: Props) {
  const { get, invalidate } = useThree();
  const look = useRef(new Vector3());
  const seated = useRef<Group>(null);
  const finale = useRef<Group>(null);
  const first = useRef(false);
  useEffect(() => {
    const { gl, scene } = get();
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.03);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.45;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [get]);
  useEffect(() => phase.on('change', () => invalidate()), [phase, invalidate]);
  useEffect(() => {
    invalidate();
  }, [chapter, theme, active, reduced, invalidate]);
  useFrame(({ camera, size, gl }) => {
    const p = phase.get();
    const pose = cameraAt(p);
    const target = look.current.set(...pose.look);
    camera.position.set(...pose.eye);
    camera.lookAt(target);
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    if (seated.current) seated.current.visible = p < 4.35;
    if (finale.current) finale.current.visible = p > 4.2;
    if (!first.current) {
      first.current = true;
      requestAnimationFrame(onReady);
    }
    gl.domElement.dataset.scenePhase = p.toFixed(3);
    gl.domElement.dataset.sceneWidth = size.width.toFixed(1);
  });
  const dark = theme === 'dark';
  return (
    <>
      <color attach="background" args={[dark ? '#20261d' : '#eeeee5']} />
      <StoryLighting phase={phase} />
      <Interior theme={theme} />
      <group ref={seated}>
        {[-1.85, 1.85].map((x, i) => (
          <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI, 0]}>
            <Workstation
              theme={theme}
              manager={i === 0}
              stage={chapter <= 1 ? 0 : chapter === 2 ? 1 : chapter === 3 ? 2 : 3}
              rework={false}
            />
            <group position={[0, 0, -0.62]}>
              <OfficeChair />
              {__HAS_LOCAL_PEOPLE__ ? (
                <RealisticPerson
                  kind={i === 0 ? 'manager' : 'employee'}
                  engaged={i === 0 ? chapter !== 2 : chapter === 2}
                  active={active}
                  reduced={reduced}
                />
              ) : (
                <StoryFigure role={i === 0 ? 'manager' : 'employee'} phase={phase} />
              )}
            </group>
          </group>
        ))}
      </group>
      {monitorGeometry.x.map((x, index) => (
        <LiveMonitor key={x} x={x} elementRef={monitorElements[index]} />
      ))}
      <group ref={finale}>
        <group position={[-0.64, 0.025, -4.05]} rotation={[0, Math.PI / 2, 0]}>
          {__HAS_LOCAL_PEOPLE__ ? (
            <HandshakePerson kind="eric" phase={phase} />
          ) : (
            <StoryFigure role="manager" meeting phase={phase} />
          )}
        </group>
        <group position={[0.64, 0.025, -4.05]} rotation={[0, -Math.PI / 2, 0]}>
          {__HAS_LOCAL_PEOPLE__ ? (
            <HandshakePerson kind="claudia" phase={phase} />
          ) : (
            <StoryFigure role="client" meeting phase={phase} />
          )}
        </group>
      </group>
    </>
  );
}

export default function CinematicScene(props: Props) {
  return (
    <Canvas
      className="cine-scene-host"
      camera={{ position: [5.4, 3.9, 6.2], fov: 39, near: 0.04, far: 50 }}
      shadows
      dpr={[1.5, 2]}
      frameloop={props.active && !props.reduced ? 'always' : 'demand'}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = PCFSoftShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-label="Офис: работа с документом, встреча руководителя и заказчика за столом и рукопожатие после согласования"
    >
      <World {...props} />
    </Canvas>
  );
}
