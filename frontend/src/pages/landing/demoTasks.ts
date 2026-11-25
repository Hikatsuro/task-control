// Example tasks for the public home page (hero board and feature cards). They are local
// examples: opening the home page never writes to the workspace.
export const columns = ['Новая', 'В работе', 'На проверке', 'Выполнена'] as const;

export interface PreviewTask {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: number;
  description: string;
}

export const tasks: PreviewTask[] = [
  {
    id: 'TC–024',
    title: 'Подготовить бриф',
    owner: 'Hikatsuro',
    due: '19 ноя',
    status: 0,
    description:
      'Собрать требования заказчика к личному кабинету и зафиксировать результат встречи в брифе.',
  },
  {
    id: 'TC–025',
    title: 'Собрать прототип',
    owner: 'malisiousintenttttt',
    due: '20 ноя',
    status: 1,
    description:
      'Связать экраны проекта и проверить путь от назначения задачи до отправки результата.',
  },
  {
    id: 'TC–026',
    title: 'Проверить документ',
    owner: 'rr0semary',
    due: '21 ноя',
    status: 2,
    description:
      'Сверить файл «Концепция портала.pdf» с брифом, проверить замечания и передать документ руководителю на приёмку.',
  },
  {
    id: 'TC–027',
    title: 'Уточнить сроки',
    owner: 'Hikatsuro',
    due: '21 ноя',
    status: 0,
    description: 'Согласовать с командой сроки демонстрации проекта.',
  },
  {
    id: 'TC–028',
    title: 'Настроить роли',
    owner: 'malisiousintenttttt',
    due: '22 ноя',
    status: 1,
    description: 'Проверить доступ руководителя и сотрудника к задачам проекта.',
  },
  {
    id: 'TC–029',
    title: 'Сверить макеты',
    owner: 'rr0semary',
    due: '20 ноя',
    status: 2,
    description: 'Проверить подписи, состояния и навигацию в макетах.',
  },
  {
    id: 'TC–023',
    title: 'Согласовать план',
    owner: 'Hikatsuro',
    due: '18 ноя',
    status: 3,
    description: 'Зафиксировать согласованный план работ и ответственных.',
  },
];
