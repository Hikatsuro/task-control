import { useReducedMotion } from 'motion/react';
import { useWorkspace } from './workspace-context';

export function useMotionPreference() {
  const system = useReducedMotion();
  const { data, user } = useWorkspace();
  return !!system || !!(user && data.settings.notifications[`${user.id}:reducedMotion`]);
}
