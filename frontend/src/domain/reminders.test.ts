import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { addComment, saveTask } from './commands';
import { offsetDate, transition, withDeadlineReminders } from './model';

describe('Уведомления и напоминания', () => {
  it('напоминания о сроках создаются один раз в день без дублей', () => {
    const data = createSeed();
    const first = withDeadlineReminders(data);
    expect(first.notifications.length).toBeGreaterThan(data.notifications.length);
    const next = withDeadlineReminders(first);
    expect(next.notifications).toHaveLength(first.notifications.length);
  });
  it('отключённые напоминания не создаются для пользователя', () => {
    const data = createSeed();
    data.settings.notifications['u2:deadline'] = false;
    const result = withDeadlineReminders(data);
    expect(
      result.notifications.filter((n) => n.id.startsWith('deadline:') && n.userId === 'u2'),
    ).toHaveLength(0);
  });
  it('выключенная приёмка не создаёт уведомление, но статус меняется', () => {
    const data = createSeed();
    data.settings.notifications['u3:review'] = false;
    const result = transition(data, data.users[0], 't4', 'done');
    expect(result.notifications).toHaveLength(data.notifications.length);
    expect(result.tasks.find((t) => t.id === 't4')?.status).toBe('done');
  });
  it('комментарии учитывают личные настройки получателя', () => {
    const data = createSeed();
    data.settings.notifications['u2:comments'] = false;
    const result = addComment(data, data.users[0], 't2', 'Согласуем ответ API');
    expect(result.notifications).toHaveLength(data.notifications.length);
    expect(result.tasks.find((t) => t.id === 't2')?.comments).toHaveLength(1);
  });
  it('редактирование задачи уведомляет исполнителя', () => {
    const data = createSeed();
    const task = data.tasks.find((t) => t.id === 't2')!;
    const result = saveTask(
      data,
      data.users[0],
      { ...task, title: 'Обновлённая схема базы', dueDate: offsetDate(2) },
      task.id,
    );
    expect(result.notifications[0].title).toBe('Сведения о задаче обновлены');
  });
});
