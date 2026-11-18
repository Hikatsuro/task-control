import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Bone, MathUtils, Mesh, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

type PersonProps = {
  kind: 'manager' | 'employee';
  engaged: boolean;
  active: boolean;
  reduced: boolean;
};

/** Each instance owns its skeleton; shared geometry/textures stay in useLoader's cache. */
export function RealisticPerson({ kind, engaged, active, reduced }: PersonProps) {
  const asset = useLoader(
    GLTFLoader,
    `/models/people-local/${kind === 'manager' ? 'eric' : 'carla'}-seated.glb`,
  );
  const character = useMemo(() => {
    const scene = clone(asset.scene);
    const joints = new Map<string, { bone: Bone; rest: Quaternion }>();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
      if (
        object instanceof Bone &&
        ['head', 'spine_02', 'hand_l', 'hand_r'].includes(object.name)
      ) {
        joints.set(object.name, { bone: object, rest: object.quaternion.clone() });
      }
    });
    return { scene, joints };
  }, [asset]);
  const motion = useRef({ turn: 0, rotation: new Quaternion(), axis: new Vector3() });
  useFrame(({ clock }, delta) => {
    const state = motion.current;
    const target = engaged ? (kind === 'manager' ? -0.13 : 0.13) : 0;
    state.turn = reduced ? target : MathUtils.damp(state.turn, target, 4, Math.min(delta, 0.05));
    const time = active && !reduced ? clock.elapsedTime : 0;
    for (const [name, joint] of character.joints) {
      const amount =
        name === 'head'
          ? state.turn + Math.sin(time * 0.8) * 0.012
          : name.startsWith('hand')
            ? engaged && time
              ? Math.sin(time * 4 + (name === 'hand_l' ? 0 : 1.9)) * 0.025
              : 0
            : Math.sin(time * 1.2) * 0.003;
      state.axis.set(0, name === 'head' ? 0 : 1, name === 'head' ? 1 : 0);
      state.rotation.setFromAxisAngle(state.axis, amount);
      joint.bone.quaternion.copy(joint.rest).multiply(state.rotation);
    }
  });
  return <primitive object={character.scene} dispose={null} />;
}
