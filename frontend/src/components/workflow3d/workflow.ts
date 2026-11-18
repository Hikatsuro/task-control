export const workflowStages = [
  {
    title: 'Назначение',
    status: 'Новая',
    code: 'new',
    headline: 'Задача получает адресата.',
    description: 'Руководитель описывает результат, назначает исполнителя и определяет срок.',
    detail: 'Понятное поручение вместо сообщения, которое легко потерять.',
    actor: 'Руководитель → сотрудник',
  },
  {
    title: 'Выполнение',
    status: 'В работе',
    code: 'in_progress',
    headline: 'Контекст остаётся рядом.',
    description:
      'Сотрудник выполняет задачу. Обсуждение, файлы и изменения собираются в одной карточке.',
    detail: 'Руководитель видит состояние работы и может вовремя помочь.',
    actor: 'Сотрудник работает над задачей',
  },
  {
    title: 'Проверка',
    status: 'На проверке',
    code: 'in_review',
    headline: 'Результат возвращается на проверку.',
    description:
      'Исполнитель прикладывает результат и передаёт его руководителю. Задача ещё не завершена.',
    detail: 'Можно принять работу или вернуть её с конкретным замечанием.',
    actor: 'Сотрудник → руководитель',
  },
  {
    title: 'Приёмка',
    status: 'Выполнена',
    code: 'done',
    headline: 'Готово — после приёмки.',
    description:
      'Руководитель подтверждает результат. Сохраняется фактическая дата, обновляется прогресс проекта.',
    detail: 'Команда видит завершённую работу и историю решений.',
    actor: 'Результат принят руководителем',
  },
] as const;

export type Point3 = [number, number, number];

const cardStops: Point3[] = [
  [-1.65, 2.6, 0.18],
  [1.65, 2.6, 0.18],
  [-1.25, 2.65, 0.38],
  [0.15, 2.7, 0.18],
];

/** One continuous route for scroll, keyboard controls and the rework branch. */
export function cardPosition(phase: number, rework: boolean): Point3 {
  if (rework) return [...cardStops[1]];
  const safe = Math.max(0, Math.min(3, phase));
  const index = Math.min(2, Math.floor(safe));
  const t = safe - index;
  const eased = t * t * (3 - 2 * t);
  return cardStops[index].map(
    (value, axis) =>
      value +
      (cardStops[index + 1][axis] - value) * eased +
      (axis === 1 ? Math.sin(t * Math.PI) * 0.3 : 0),
  ) as Point3;
}

export function stageForPhase(phase: number) {
  return Math.max(0, Math.min(3, Math.round(phase)));
}
