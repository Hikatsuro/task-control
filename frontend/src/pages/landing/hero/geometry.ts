// Sizes, palette and poses shared by the hero's board and its task cards.
// Sizes are in CSS pixels. The HTML cards are drawn at twice their board size and only
// scaled down, so their text stays sharp.
export const CARD = { width: 380, height: 300 };
export const CARD_ON_BOARD = 0.5;
export const BOARD = { width: 960, height: 600 };

const COLUMN = { left: 56, top: 158, width: 200, gap: 16, row: 162 };

// Board cards use the approved Figma palette.
export const swatches = [
  { fill: '#f45c28', text: '#20231f' },
  { fill: '#a23c18', text: '#fff6ef' },
  { fill: '#2b3027', text: '#f5f6f0' },
  { fill: '#5e6a4c', text: '#f7f8f2' },
  { fill: '#f7b596', text: '#20231f' },
  { fill: '#d5dcc6', text: '#20231f' },
  { fill: '#fffdf7', text: '#20231f' },
] as const;
export const taskSwatch = [0, 2, 4, 3, 1, 5, 2];

/** Centre of a card in a board column, board-local, measured from the board centre. */
export function slot(status: number, row: number) {
  return {
    x: -BOARD.width / 2 + COLUMN.left + status * (COLUMN.width + COLUMN.gap) + COLUMN.width / 2,
    y: -BOARD.height / 2 + COLUMN.top + row * COLUMN.row + (CARD.height * CARD_ON_BOARD) / 2,
  };
}

// Deterministic pseudo-random, so the scene looks the same on every load.
export function noise(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
export const smooth = (v: number) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, m: number) => a + (b - a) * m;

/** Where a card is: the board placement, its slot on the board, then its own turn and size. */
export interface Pose {
  x: number;
  y: number;
  z: number;
  tiltX: number; // board rotation
  tiltZ: number;
  scale: number;
  slotX: number;
  slotY: number;
  lift: number;
  roll: number; // own rotation around Z
  twist: number; // own rotation around X
  turn: number; // own rotation around Y
  sx: number;
  sy: number;
  sz: number;
}

export function mixPose(a: Pose, b: Pose, m: number): Pose {
  const out = {} as Pose;
  for (const key of Object.keys(a) as (keyof Pose)[]) out[key] = mix(a[key], b[key], m);
  return out;
}

export function poseTransform(p: Pose) {
  return (
    `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,${p.z.toFixed(2)}px) ` +
    `rotateX(${p.tiltX.toFixed(3)}deg) rotateZ(${p.tiltZ.toFixed(3)}deg) scale(${p.scale.toFixed(5)}) ` +
    `translate3d(${p.slotX.toFixed(2)}px,${p.slotY.toFixed(2)}px,${p.lift.toFixed(2)}px) ` +
    `rotateZ(${p.roll.toFixed(3)}deg) rotateX(${p.twist.toFixed(3)}deg) rotateY(${p.turn.toFixed(3)}deg) ` +
    `scale3d(${p.sx.toFixed(5)},${p.sy.toFixed(5)},${p.sz.toFixed(5)})`
  );
}

export interface Layout {
  width: number;
  height: number;
  compact: boolean;
}

export interface BoardPose {
  x: number;
  y: number;
  z: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
}

// The board first settles in the middle, then slides aside for the second message.
export function boardPose(settle: number, view: Layout): BoardPose {
  const { width: W, height: H, compact } = view;
  const fit = Math.min((W * (compact ? 0.98 : 0.66)) / BOARD.width, (H * 0.7) / BOARD.height);
  const centre = { x: 0, y: H * 0.07, z: 0, tiltX: 54, tiltZ: -32, scale: fit };
  const aside = compact
    ? { x: W * 0.04, y: H * 0.2, z: 0, tiltX: 50, tiltZ: -30, scale: fit * 1.05 }
    : { x: W * 0.27, y: H * 0.1, z: 0, tiltX: 42, tiltZ: -24, scale: fit * 1.18 };
  const m = smooth(settle);
  return {
    x: mix(centre.x, aside.x, m),
    y: mix(centre.y, aside.y, m),
    z: mix(centre.z, aside.z, m),
    tiltX: mix(centre.tiltX, aside.tiltX, m),
    tiltZ: mix(centre.tiltZ, aside.tiltZ, m),
    scale: mix(centre.scale, aside.scale, m),
  };
}
