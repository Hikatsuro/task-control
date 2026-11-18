import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import {
  availableTasks,
  isOverdue,
  offsetDate,
  projectProgress,
  transition,
  workspaceSchema,
} from './model';
import { saveProject, saveTask, saveUser } from './commands';

describe('Доступ и жизненный цикл задачи', () => {
  it('сотрудник видит только назначенные ему задачи доступных проектов', () => {
    const d = createSeed();
    const tasks = availableTasks(d, d.users[1]);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.assigneeId === 'u2')).toBe(true);
    expect(tasks.some((t) => t.id === 't1')).toBe(false);
  });
  it('администратор не получает бизнес-доступ автоматически', () => {
    const d = createSeed();
    expect(availableTasks(d, d.users[3])).toHaveLength(0);
    expect(() => transition(d, d.users[3], 't4', 'done')).toThrow();
  });
  it('сотрудник передаёт работу, руководитель принимает', () => {
    const d = createSeed();
    const employee = d.users[1];
    const manager = d.users[0];
    const started = transition(d, employee, 't6', 'in_progress');
    const reviewed = transition(started, employee, 't6', 'in_review');
    expect(() => transition(reviewed, employee, 't6', 'done')).toThrow();
    const done = transition(reviewed, manager, 't6', 'done');
    expect(done.tasks.find((t) => t.id === 't6')?.completedAt).toBeTruthy();
    expect(done.tasks.find((t) => t.id === 't6')?.activity).toHaveLength(4);
  });
  it('возврат с проверки требует причины и сохраняет историю', () => {
    const d = createSeed();
    expect(() => transition(d, d.users[0], 't4', 'in_progress')).toThrow('причину');
    const next = transition(d, d.users[0], 't4', 'in_progress', 'Исправить поведение формы');
    expect(next.tasks.find((t) => t.id === 't4')?.activity.at(-1)?.text).toContain('Исправить');
  });
  it('нельзя перескочить из новой задачи сразу в выполненную', () => {
    const d = createSeed();
    expect(() => transition(d, d.users[0], 't3', 'done')).toThrow();
  });
  it('возобновление работы очищает фактическую дату', () => {
    const d = createSeed();
    const next = transition(d, d.users[0], 't7', 'in_progress');
    expect(next.tasks.find((t) => t.id === 't7')?.completedAt).toBeNull();
  });
});
describe('Проверка данных', () => {
  it('исполнитель должен входить в проект', () => {
    const d = createSeed();
    expect(() =>
      saveTask(d, d.users[0], {
        title: 'Новая задача',
        description: '',
        projectId: 'p4',
        assigneeId: 'u2',
        priority: 'medium',
        dueDate: offsetDate(1),
      }),
    ).toThrow('участника');
  });
  it('срок задачи не выходит за рамки проекта', () => {
    const d = createSeed();
    expect(() =>
      saveTask(d, d.users[0], {
        title: 'Новая задача',
        description: '',
        projectId: 'p1',
        assigneeId: 'u2',
        priority: 'medium',
        dueDate: offsetDate(80),
      }),
    ).toThrow('период');
  });
  it('активный проект с непринятыми задачами нельзя архивировать', () => {
    const d = createSeed();
    expect(() =>
      saveProject(d, d.users[0], { ...d.projects[0], status: 'archived' }, 'p1'),
    ).toThrow('примите');
  });
  it('пользователь не может заблокировать себя', () => {
    const d = createSeed();
    expect(() => saveUser(d, d.users[3], { ...d.users[3], active: false }, 'u4')).toThrow('себя');
  });
  it('логины уникальны без учёта регистра', () => {
    const d = createSeed();
    expect(() => saveUser(d, d.users[3], { ...d.users[1], username: 'HIKATSURO' })).toThrow(
      'занят',
    );
  });
  it('созданная задача появляется в общем наборе и уведомляет исполнителя', () => {
    const d = createSeed();
    const next = saveTask(d, d.users[0], {
      title: 'Проверка сохранения',
      description: '',
      projectId: 'p1',
      assigneeId: 'u2',
      priority: 'medium',
      dueDate: offsetDate(2),
    });
    expect(next.tasks).toHaveLength(d.tasks.length + 1);
    expect(next.notifications[0].userId).toBe('u2');
    expect(workspaceSchema.safeParse(JSON.parse(JSON.stringify(next))).success).toBe(true);
  });
  it('просрочка вычисляется, а выполненные задачи не считаются просроченными', () => {
    const d = createSeed();
    expect(isOverdue({ ...d.tasks[0], dueDate: '2000-01-01' })).toBe(true);
    expect(isOverdue({ ...d.tasks[0], dueDate: '2000-01-01', status: 'done' })).toBe(false);
    expect(projectProgress([])).toBe(0);
  });
});
