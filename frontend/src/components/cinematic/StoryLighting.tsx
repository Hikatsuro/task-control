import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { DirectionalLight, HemisphereLight, Object3D, SpotLight } from 'three';
import { smooth } from './timeline';

/** The meeting uses a softer key and window rim; the workstation lighting stays intact. */
export function StoryLighting({ phase }: { phase: MotionValue<number> }) {
  const ambient = useRef<HemisphereLight>(null);
  const officeKey = useRef<DirectionalLight>(null);
  const officeRim = useRef<DirectionalLight>(null);
  const officeFill = useRef<DirectionalLight>(null);
  const meetingKey = useRef<SpotLight>(null);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, 0.85, -4.05);
    return object;
  }, []);
  useFrame(() => {
    const blend = smooth((phase.get() - 4.2) / 0.18);
    if (ambient.current) ambient.current.intensity = 1.2 - blend * 0.55;
    if (officeKey.current) officeKey.current.intensity = 2.7 - blend * 1.8;
    if (officeRim.current) officeRim.current.intensity = 1.9 - blend * 0.5;
    if (officeFill.current) officeFill.current.intensity = 0.55 - blend * 0.35;
    if (meetingKey.current) meetingKey.current.intensity = blend * 27;
  });
  return (
    <>
      <hemisphereLight ref={ambient} args={['#eef4ef', '#8f7e64', 1.2]} />
      <directionalLight
        ref={officeKey}
        position={[-3, 8, 5]}
        intensity={2.7}
        color="#fff0d9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-far={26}
        shadow-normalBias={0.015}
        shadow-bias={-0.00015}
        shadow-radius={3}
      />
      <directionalLight ref={officeRim} position={[3, 4, -6]} intensity={1.9} color="#d6e8f6" />
      <directionalLight ref={officeFill} position={[0, 2.5, 4]} intensity={0.55} color="#fff9ec" />
      <primitive object={target} />
      <spotLight
        ref={meetingKey}
        target={target}
        position={[-1.3, 3.5, -2.25]}
        color="#fff1db"
        intensity={0}
        angle={0.65}
        penumbra={1}
        distance={8}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.005}
        shadow-bias={-0.00008}
        shadow-radius={4}
      />
    </>
  );
}
