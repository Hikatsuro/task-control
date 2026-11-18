import { useEffect, useMemo, useRef } from 'react';
import { addAfterEffect, Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  CatmullRomCurve3,
  Group,
  MathUtils,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { MotionValue } from 'motion/react';
import type { Theme } from '../../state/theme';
import { cardPosition } from './workflow';
import { FloorLabel, Plant, TaskTicket } from './OfficeModels';
import { OfficeChair, OfficeRoom, Workstation } from './OfficeInterior';
import { RealisticPerson } from './RealisticPerson';
import { StoryFigure } from '../cinematic/StoryFigure';

declare const __HAS_LOCAL_PEOPLE__: boolean;

type SceneProps = {
  phase: MotionValue<number>;
  stage: number;
  rework: boolean;
  theme: Theme;
  active: boolean;
  reduced: boolean;
  onReady: () => void;
};

function OfficeWorld({ phase, stage, rework, theme, active, reduced, onReady }: SceneProps) {
  const { size, invalidate, get } = useThree();
  const ticket = useRef<Group>(null);
  const puck = useRef<Group>(null);
  const hasRendered = useRef(false);
  const dark = theme === 'dark';
  const targetRef = useRef(new Vector3());
  const cameraTargetRef = useRef(new Vector3());
  const route = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-1.75, 0.05, 0.92),
        new Vector3(-0.9, 0.05, 1.35),
        new Vector3(0, 0.05, 1.5),
        new Vector3(0.9, 0.05, 1.35),
        new Vector3(1.75, 0.05, 0.92),
      ]),
    [],
  );
  const tube = useMemo(() => new TubeGeometry(route, 64, 0.011, 6, false), [route]);
  useEffect(() => () => tube.dispose(), [tube]);
  useEffect(() => {
    const { gl, scene } = get();
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.28;
    room.dispose();
    generator.dispose();
    invalidate();
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [get, invalidate]);
  useEffect(
    () =>
      addAfterEffect(() => {
        if (!hasRendered.current) {
          hasRendered.current = true;
          onReady();
        }
      }),
    [onReady],
  );
  useEffect(() => {
    const camera = get().camera;
    if (camera instanceof OrthographicCamera) {
      camera.zoom = Math.min(size.width / 8.8, size.height / 5.9);
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [get, size, invalidate]);
  useEffect(
    () =>
      phase.on('change', () => {
        if (active) invalidate();
      }),
    [phase, invalidate, active],
  );
  useEffect(() => {
    invalidate();
  }, [stage, rework, theme, reduced, invalidate]);
  useFrame(({ clock, camera }, delta) => {
    const target = targetRef.current;
    const cameraTarget = cameraTargetRef.current;
    const p = phase.get();
    target.set(...cardPosition(p, rework));
    if (!reduced && active) target.y += Math.sin(clock.elapsedTime * 1.4) * 0.014;
    if (ticket.current) {
      if (reduced) ticket.current.position.copy(target);
      else ticket.current.position.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 6));
      ticket.current.rotation.set(-0.19, 0.5, rework ? -0.045 : 0.01);
    }
    if (puck.current) {
      const t = rework ? 1 : p <= 1 ? p : p <= 2 ? 2 - p : (p - 2) * 0.5;
      puck.current.position.copy(route.getPointAt(MathUtils.clamp(t, 0, 1)));
    }
    cameraTarget.set(6.5 + Math.sin(p * 1.4) * 0.4, 5.3 + p * 0.12, 10);
    if (reduced) camera.position.set(6.5, 5.6, 10);
    else camera.position.lerp(cameraTarget, 1 - Math.exp(-Math.min(delta, 0.05) * 3));
    camera.lookAt(0, 1.12, -0.12);
  });
  return (
    <>
      <hemisphereLight args={['#e8efef', '#8d8069', dark ? 0.95 : 1.3]} />
      <directionalLight
        position={[-3, 7, 4]}
        intensity={dark ? 2.1 : 2.5}
        color="#fff0d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-bias={-0.0002}
        shadow-normalBias={0.012}
        shadow-radius={3}
      />
      <directionalLight position={[2, 3, -4]} intensity={dark ? 1.1 : 1.4} color="#d8e7f2" />
      <OfficeRoom theme={theme} />
      <mesh geometry={tube}>
        <meshStandardMaterial color={dark ? '#cb9776' : '#ae704b'} roughness={0.8} />
      </mesh>
      <group ref={puck}>
        <mesh position={[0, 0.01, 0]}>
          <sphereGeometry args={[0.045, 16, 10]} />
          <meshStandardMaterial color="#ed9971" roughness={0.4} />
        </mesh>
      </group>
      {([-1.65, 1.65] as const).map((x, index) => (
        <group key={x} position={[x, 0.035, -0.25]} rotation={[0, index === 0 ? -0.08 : 0.08, 0]}>
          <Workstation theme={theme} manager={index === 0} stage={stage} rework={rework} />
          <group position={[0, 0, -0.62]}>
            <OfficeChair />
            {__HAS_LOCAL_PEOPLE__ ? (
              <RealisticPerson
                kind={index === 0 ? 'manager' : 'employee'}
                engaged={index === 0 ? stage === 0 || stage >= 2 : stage === 1 || rework}
                active={active}
                reduced={reduced}
              />
            ) : (
              <StoryFigure role={index === 0 ? 'manager' : 'employee'} phase={phase} />
            )}
          </group>
        </group>
      ))}
      <Plant position={[-3.05, 0.025, -1.4]} size={0.84} />
      <Plant position={[3.08, 0.025, -1.62]} size={1.12} />
      <group scale={0.65} position={[-1.65, 0.04, 1.82]}>
        <FloorLabel text="РУКОВОДИТЕЛЬ" position={[0, 0, 0]} theme={theme} />
      </group>
      <group scale={0.65} position={[1.65, 0.04, 1.82]}>
        <FloorLabel text="СОТРУДНИК" position={[0, 0, 0]} theme={theme} />
      </group>
      <group ref={ticket} position={[-1.65, 2.6, 0.18]} scale={0.58}>
        <TaskTicket theme={theme} stage={stage} rework={rework} />
      </group>
    </>
  );
}

export default function OfficeScene(props: SceneProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [6.5, 5.3, 10], zoom: 65, near: 0.1, far: 40 }}
      shadows
      dpr={[1, 1.5]}
      frameloop={props.active && !props.reduced ? 'always' : 'demand'}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = PCFShadowMap;
      }}
      aria-label="Трёхмерный офис: задача перемещается между руководителем и сотрудником"
    >
      <OfficeWorld {...props} />
    </Canvas>
  );
}
