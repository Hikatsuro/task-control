import { tasks } from '../demoTasks';
import type { PreviewTask } from '../demoTasks';
import { CARD, CARD_ON_BOARD, clamp, noise, slot, smooth, swatches, taskSwatch } from './geometry';
import type { BoardPose, Pose } from './geometry';

// The seven board tasks land on the board. The others fill the circle and the arc,
// then sink into the board; they are illustrative examples for the public page.
const extras: PreviewTask[] = [
  ['TC–010', 'Собрать требования', 'Hikatsuro', '12 ноя', 3],
  ['TC–011', 'Обновить макеты', 'rr0semary', '14 ноя', 1],
  ['TC–012', 'Проверить отчёт', 'Hikatsuro', '15 ноя', 2],
  ['TC–013', 'Настроить уведомления', 'malisiousintenttttt', '16 ноя', 1],
  ['TC–014', 'Согласовать бюджет', 'Hikatsuro', '17 ноя', 0],
  ['TC–015', 'Подготовить презентацию', 'rr0semary', '18 ноя', 0],
  ['TC–016', 'Протестировать вход', 'malisiousintenttttt', '18 ноя', 2],
  ['TC–017', 'Описать роли', 'Hikatsuro', '19 ноя', 3],
  ['TC–018', 'Загрузить вложения', 'rr0semary', '19 ноя', 1],
  ['TC–019', 'Обновить календарь', 'malisiousintenttttt', '20 ноя', 0],
  ['TC–020', 'Собрать отзывы', 'rr0semary', '21 ноя', 2],
  ['TC–021', 'Сверить сроки', 'Hikatsuro', '22 ноя', 0],
  ['TC–022', 'Подготовить отчёт', 'malisiousintenttttt', '23 ноя', 1],
].map(([id, title, owner, due, status]) => ({
  id: id as string,
  title: title as string,
  owner: owner as string,
  due: due as string,
  status: status as number,
  description: '',
}));

export interface MorphCard {
  task: PreviewTask;
  board: boolean; // lands on the board
  fill: string;
  text: string;
  slotX: number;
  slotY: number;
  delay: number;
  scatter: { x: number; y: number; roll: number };
}

export function createCards(count: number): MorphCard[] {
  const rows = [0, 0, 0, 0];
  // Board tasks are spread through the deck so they come from every part of the arc.
  const order: (PreviewTask | null)[] = Array.from({ length: count }, () => null);
  tasks.forEach((task, i) => {
    order[Math.round(((i + 0.5) / tasks.length) * (count - 1))] = task;
  });
  let extra = 0;
  return order.map((maybe, i) => {
    const board = maybe !== null;
    const task = maybe ?? extras[extra++ % extras.length];
    const swatch = board
      ? swatches[taskSwatch[tasks.indexOf(task)]]
      : swatches[[0, 4, 3, 1, 5, 2][i % 6]];
    const place = board
      ? slot(task.status, rows[task.status]++)
      : { x: (noise(i) - 0.5) * 600, y: (noise(i + 9) - 0.5) * 340 };
    return {
      task,
      board,
      fill: swatch.fill,
      text: swatch.text,
      slotX: place.x,
      slotY: place.y,
      delay: (i / count) * 0.35,
      scatter: {
        x: (noise(i * 3.3) - 0.5) * 1500,
        y: (noise(i * 7.1) - 0.5) * 1000,
        roll: (noise(i * 1.9) - 0.5) * 180,
      },
    };
  });
}

export interface View {
  width: number;
  height: number;
  compact: boolean;
  parallax: number; // eased, px
}

export interface Shape {
  x: number;
  y: number;
  roll: number;
  size: number; // multiplier of the base card width
  alpha: number;
}

export function cardWidth(view: View) {
  return clamp(view.width * (view.compact ? 0.13 : 0.06), 58, 96);
}

export function scatterShape(card: MorphCard): Shape {
  return { ...card.scatter, size: 0.6, alpha: 0 };
}

export function lineShape(i: number, count: number, view: View): Shape {
  const spacing = cardWidth(view) + 12;
  return { x: (i - (count - 1) / 2) * spacing, y: 0, roll: 0, size: 1, alpha: 1 };
}

export function circleShape(i: number, count: number, view: View): Shape {
  const radius = Math.min(Math.min(view.width, view.height) * 0.35, 330);
  const angle = (i / count) * 360;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
    roll: angle + 90,
    size: 1,
    alpha: 1,
  };
}

// A rainbow arch at the bottom of the screen. Scrolling slides the cards along it.
export function arcShape(i: number, count: number, view: View, shuffle: number): Shape {
  const { width: W, height: H, compact } = view;
  const radius = Math.min(W, H * 1.5) * (compact ? 1.4 : 1.1);
  // The arch runs past both edges of the screen, so sliding along it never leaves a gap.
  const apex = H * (compact ? 0.12 : 0.1);
  const spread = compact ? 120 : 150;
  const start = -90 - spread / 2;
  const step = spread / (count - 1);
  const angle = start + i * step + (0.5 - shuffle) * spread * 0.3;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius + view.parallax,
    y: Math.sin(rad) * radius + apex + radius,
    roll: angle + 90,
    size: compact ? 1.35 : 1.7,
    alpha: 1,
  };
}

export function mixShape(a: Shape, b: Shape, m: number): Shape {
  return {
    x: a.x + (b.x - a.x) * m,
    y: a.y + (b.y - a.y) * m,
    roll: a.roll + (b.roll - a.roll) * m,
    size: a.size + (b.size - a.size) * m,
    alpha: a.alpha + (b.alpha - a.alpha) * m,
  };
}

export function shapePose(shape: Shape, view: View): Pose {
  const scale = (cardWidth(view) * shape.size) / CARD.width;
  return {
    x: shape.x,
    y: shape.y,
    z: 0,
    tiltX: 0,
    tiltZ: 0,
    scale: 1,
    slotX: 0,
    slotY: 0,
    lift: 0,
    roll: shape.roll,
    twist: 0,
    turn: 0,
    sx: scale,
    sy: scale,
    sz: 1,
  };
}

export function landedPose(card: MorphCard, board: BoardPose): Pose {
  const size = card.board ? CARD_ON_BOARD : 0;
  return {
    ...board,
    slotX: card.slotX,
    slotY: card.slotY,
    lift: card.board ? 14 : -14,
    roll: 0,
    twist: 0,
    turn: 0,
    sx: size,
    sy: size,
    sz: 1,
  };
}

// Scroll timeline across the pinned track, 0..1.
export function timeline(p: number) {
  const morph = smooth((p - 0.03) / 0.2); // circle → arc
  return {
    morph,
    shuffle: smooth((p - 0.24) / 0.26), // cards slide along the arc
    land: clamp((p - 0.5) / 0.28), // arc → board
    board: smooth((p - 0.55) / 0.15),
    settle: clamp((p - 0.8) / 0.14), // board moves aside
    intro: 1 - smooth(morph * 2), // headline inside the circle
    arc: smooth((morph - 0.75) / 0.25) * (1 - smooth((p - 0.47) / 0.06)),
    outro: smooth((p - 0.84) / 0.1),
  };
}
