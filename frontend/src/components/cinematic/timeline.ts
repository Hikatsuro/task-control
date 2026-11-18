import { monitorCloseup, monitorGeometry } from './monitorGeometry';

export type Point = [number, number, number];

export const chapters = [
  {
    at: 0,
    nav: 'Начало',
    title: 'От поручения\nдо принятого\nдокумента.',
    description: 'Один документ. Вся история работы — от первого задания до встречи с заказчиком.',
    actor: 'Команда в одном ритме',
    status: 'Проект начинается',
  },
  {
    at: 1.15,
    nav: 'Назначение',
    title: 'Хорошая работа\nначинается\nс ясной задачи.',
    description:
      'Руководитель определяет результат, назначает сотрудника и задаёт срок. Всё необходимое уже в карточке.',
    actor: 'Руководитель назначает',
    status: 'Новая задача',
  },
  {
    at: 2.15,
    nav: 'Выполнение',
    title: 'Документ\nобретает\nсодержание.',
    description:
      'Сотрудник готовит результат. Текст, вложения и обсуждение остаются рядом с поручением.',
    actor: 'Сотрудник выполняет',
    status: 'В работе',
  },
  {
    at: 3.15,
    nav: 'Проверка',
    title: 'Каждая деталь\nпроходит\nпроверку.',
    description:
      'Руководитель открывает документ, сверяет результат с заданием и оставляет конкретное замечание.',
    actor: 'Руководитель проверяет',
    status: 'На проверке',
  },
  {
    at: 4,
    nav: 'Приёмка',
    title: 'Результат\nподтверждён.\nРабота принята.',
    description:
      'Замечание учтено. Руководитель принимает документ, а история проекта сохраняет это решение.',
    actor: 'Руководитель принимает',
    status: 'Выполнена',
  },
  {
    at: 4.98,
    nav: 'Результат',
    title: 'Результат принят.\nДоверие\nподтверждено.',
    description:
      'Руководитель и заказчик встречаются за столом, сверяют документы и подтверждают результат рукопожатием.',
    actor: 'Руководитель и заказчик',
    status: 'Результат передан',
  },
] as const;

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
export function smooth(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}
export function chapterAt(phase: number) {
  const thresholds = [0.68, 1.7, 2.7, 3.65, 4.45];
  return thresholds.filter((threshold) => phase >= threshold).length;
}

const keys: { at: number; eye: Point; look: Point; fov: number }[] = [
  { at: 0, eye: [5.4, 3.9, 6.2], look: [0, 0.85, -0.15], fov: 39 },
  { at: 0.48, eye: [-2.55, 1.5, 1.6], look: [-1.95, 1.065, -0.35], fov: 37 },
  { at: 0.78, eye: [-2.25, 1.25, 0.45], look: [-1.95, 1.065, -0.35], fov: 35 },
  { at: 1, ...monitorCloseup(monitorGeometry.x[0]) },
  { at: 1.4, ...monitorCloseup(monitorGeometry.x[0]) },
  { at: 1.55, eye: [-2.35, 1.3, 0.5], look: [-1.95, 1.065, -0.35], fov: 35 },
  { at: 1.7, eye: [-0.1, 1.9, 1.8], look: [0, 1.065, -0.35], fov: 37 },
  { at: 1.85, eye: [2.35, 1.3, 0.5], look: [1.75, 1.065, -0.35], fov: 35 },
  { at: 2, ...monitorCloseup(monitorGeometry.x[1]) },
  { at: 2.4, ...monitorCloseup(monitorGeometry.x[1]) },
  { at: 2.55, eye: [2.35, 1.3, 0.5], look: [1.75, 1.065, -0.35], fov: 35 },
  { at: 2.7, eye: [0.05, 1.9, 1.8], look: [0, 1.065, -0.35], fov: 37 },
  { at: 2.85, eye: [-2.35, 1.3, 0.5], look: [-1.95, 1.065, -0.35], fov: 35 },
  { at: 3, ...monitorCloseup(monitorGeometry.x[0]) },
  { at: 4.06, ...monitorCloseup(monitorGeometry.x[0]) },
  { at: 4.2, eye: [-2.35, 1.3, 0.5], look: [-1.95, 1.065, -0.35], fov: 35 },
  { at: 4.36, eye: [0.65, 1.8, 0.1], look: [0, 0.85, -4.05], fov: 34 },
  { at: 4.68, eye: [0.4, 1.63, -0.85], look: [0, 0.91, -4.05], fov: 34 },
  { at: 5, eye: [0.22, 1.53, -1.05], look: [0, 0.94, -4.05], fov: 34 },
];

/** Absolute sampling makes reverse scroll, direct chapter links and reload deterministic. */
export function cameraAt(value: number) {
  const phase = clamp(value, 0, 5);
  const next = keys.findIndex((key) => key.at > phase);
  if (next === -1) return keys[keys.length - 1];
  const a = keys[Math.max(0, next - 1)];
  const b = keys[next];
  const duration = b.at - a.at;
  const t = (phase - a.at) / duration;
  const tangent = (index: number, read: (key: typeof a) => number) => {
    if (index === 0 || index === keys.length - 1) return 0;
    const previous = keys[index - 1],
      current = keys[index],
      following = keys[index + 1];
    const before = current.at - previous.at,
      after = following.at - current.at;
    const left = (read(current) - read(previous)) / before;
    const right = (read(following) - read(current)) / after;
    if (left * right <= 0) return 0;
    const w1 = 2 * after + before,
      w2 = after + 2 * before;
    return (w1 + w2) / (w1 / left + w2 / right);
  };
  const mix = (read: (key: typeof a) => number) =>
    (2 * t * t * t - 3 * t * t + 1) * read(a) +
    (t * t * t - 2 * t * t + t) * duration * tangent(next - 1, read) +
    (-2 * t * t * t + 3 * t * t) * read(b) +
    (t * t * t - t * t) * duration * tangent(next, read);
  return {
    eye: [0, 1, 2].map((axis) => mix((key) => key.eye[axis])) as Point,
    look: [0, 1, 2].map((axis) => mix((key) => key.look[axis])) as Point,
    fov: mix((key) => key.fov),
  };
}

/** Interaction focus only. Screen pixels are never faded or replaced. */
export function screenFocus(phase: number) {
  const windows = [
    [0.9, 1, 1.4, 1.55],
    [1.9, 2, 2.4, 2.55],
    [2.9, 3, 4.06, 4.22],
  ];
  return Math.max(
    ...windows.map(
      ([start, enter, hold, end]) =>
        smooth((phase - start) / (enter - start)) * (1 - smooth((phase - hold) / (end - hold))),
    ),
  );
}

export function handshakeAt(phase: number) {
  return smooth((phase - 4.36) / 0.62);
}
