import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Info, Send } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import {
  availableProjects,
  availableTasks,
  formatDate,
  isOverdue,
  localDate,
  statusLabels,
} from '../domain/model';
import type { Task } from '../domain/model';
import { ServerAssistant } from './AssistantServer';
import {
  Button,
  Empty,
  Field,
  Modal,
  Notice,
  PageHeading,
  Panel,
  Screen,
  Stat,
  StatusBadge,
} from '../components/ui';

type Message = { id: number; role: 'user' | 'assistant'; text: string; taskIds: string[] };
export function Assistant() {
  const { data, user, server } = useWorkspace();
  const [project, setProject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // With Django the summary comes from the local model; the browser demo keeps its rules.
  if (server) return <ServerAssistant />;
  if (!user) return null;
  const projects = availableProjects(data, user);
  const tasks = availableTasks(data, user).filter((t) => !project || t.projectId === project);
  function answer(text: string) {
    if (!text.trim()) return;
    const overdue = /просроч|опозд|дедлайн/i.test(text);
    const review = /проверк|приём|прием/i.test(text);
    const selected = tasks.filter((t) =>
      overdue ? isOverdue(t) : review ? t.status === 'in_review' : t.status !== 'done',
    );
    const response = `${overdue ? 'Просроченные задачи' : review ? 'Работы на проверке' : 'Сводка доступных задач'}${project ? ` проекта «${projects.find((p) => p.id === project)?.name}»` : ''}.\nВсего задач: ${tasks.length}. Выполнено: ${tasks.filter((t) => t.status === 'done').length}. На проверке: ${tasks.filter((t) => t.status === 'in_review').length}. Просрочено: ${tasks.filter((t) => isOverdue(t)).length}.\n${selected.length ? 'Ниже — задачи, на которые можно обратить внимание.' : 'По выбранному условию задач нет.'}`;
    setMessages((items) => [
      ...items,
      { id: Date.now(), role: 'user', text, taskIds: [] },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: response,
        taskIds: selected.slice(0, 8).map((t) => t.id),
      },
    ]);
    setPrompt('');
    inputRef.current?.focus();
  }
  return (
    <Screen>
      <PageHeading title="AI-помощник" />
      <Notice>
        <Info size={18} />
        <span>
          Демонстрационный режим. Ответы формируются по правилам из доступных задач; языковая модель
          ещё не подключена.
        </span>
      </Notice>
      <div className="assistant-layout">
        <Panel className="chat-panel">
          <div className="chat-heading">
            <Bot size={22} />
            <div>
              <h2>Помощник команды</h2>
              <span>Инструмент чтения задач · демо</span>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" onClick={() => setMessages([])}>
                Новый диалог
              </Button>
            )}
          </div>
          <div className="chat-messages">
            {messages.length ? (
              messages.map((m) => (
                <article key={m.id} className={`chat-message chat-${m.role}`}>
                  <span>{m.role === 'user' ? user.name : 'TaskControl · демосводка'}</span>
                  <p className="preserve-lines">{m.text}</p>
                  {m.taskIds.length > 0 && (
                    <div className="chat-task-links">
                      {m.taskIds.map((id) => {
                        const t = tasks.find((t) => t.id === id);
                        return (
                          t && (
                            <Link key={id} to={`/app/tasks/${id}`}>
                              <span>{t.title}</span>
                              <small>
                                {statusLabels[t.status]} · {formatDate(t.dueDate)}
                              </small>
                              <ArrowRight size={15} />
                            </Link>
                          )
                        );
                      })}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="chat-welcome">
                <h2>Спросите о задачах проекта</h2>
                <p>Сводка собирается по правилам из задач выбранного проекта.</p>
                <div className="prompt-examples">
                  {['Сводка по задачам', 'Какие задачи просрочены?', 'Что ожидает проверки?'].map(
                    (text) => (
                      <button key={text} onClick={() => answer(text)}>
                        {text}
                        <ArrowRight size={15} />
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              answer(prompt);
            }}
          >
            <input
              ref={inputRef}
              aria-label="Запрос помощнику"
              value={prompt}
              maxLength={1000}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Спросите о задачах проекта…"
              required
            />
            <Button type="submit" disabled={!prompt.trim()} aria-label="Отправить запрос">
              <Send size={18} />
            </Button>
          </form>
        </Panel>
        <aside>
          <Panel title="Контекст сводки">
            <Field label="Проект">
              <select
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  setMessages([]);
                }}
              >
                <option value="">Все доступные проекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <p>В сводку входят название задачи, исполнитель, статус, срок и ссылка на карточку.</p>
            <div className="context-count">
              <strong>{tasks.length}</strong>
              <span>доступных задач</span>
            </div>
            <Notice>
              Помощник работает в контексте выбранного демопрофиля. Смена проекта начинает новый
              диалог.
            </Notice>
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}
function demoRisk(task: Task) {
  if (task.status === 'done') return 0;
  const days = task.dueDate
    ? Math.ceil(
        (new Date(`${task.dueDate}T12:00:00`).getTime() -
          new Date(`${localDate()}T12:00:00`).getTime()) /
          86400000,
      )
    : 30;
  return Math.min(
    95,
    Math.max(
      10,
      (days < 0 ? 80 : days <= 1 ? 60 : days <= 3 ? 45 : days <= 7 ? 25 : 10) +
        (task.priority === 'high' ? 15 : task.priority === 'medium' ? 5 : 0) +
        (task.status === 'new' ? 10 : 0),
    ),
  );
}
export function Forecast() {
  const { data, user } = useWorkspace();
  const [project, setProject] = useState('');
  const [explanation, setExplanation] = useState<Task | null>(null);
  if (!user) return null;
  const projects = availableProjects(data, user);
  const tasks = availableTasks(data, user)
    .filter((t) => t.status !== 'done' && (!project || t.projectId === project))
    .sort((a, b) => demoRisk(b) - demoRisk(a));
  return (
    <Screen>
      <PageHeading
        title="Прогноз сроков"
        description="Задачи, на сроки которых стоит обратить внимание."
      />
      <Notice tone="warning">
        Демонстрация будущего ML-раздела. Индекс 0–100 рассчитан простыми правилами по сроку,
        приоритету и статусу. Это не вероятность просрочки и не результат обученной модели.
      </Notice>
      <div className="stats-row">
        <Stat value={tasks.length} label="открытых задач" />
        <Stat
          value={tasks.filter((t) => demoRisk(t) >= 60).length}
          label="с высоким индексом риска"
          accent
        />
        <Stat value={tasks.filter((t) => isOverdue(t)).length} label="уже просрочено" />
      </div>
      <label className="field forecast-filter">
        <span>Проект</span>
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {tasks.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Статус</th>
                <th>Срок</th>
                <th>Демоиндекс</th>
                <th>Объяснение</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link className="task-title-link" to={`/app/tasks/${t.id}`}>
                      {t.title}
                    </Link>
                    <small>{data.projects.find((p) => p.id === t.projectId)?.name}</small>
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td className={isOverdue(t) ? 'overdue' : ''}>{formatDate(t.dueDate)}</td>
                  <td>
                    <span className={`risk-value ${demoRisk(t) >= 60 ? 'risk-high' : ''}`}>
                      {demoRisk(t)}
                      <small>/100</small>
                    </span>
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setExplanation(t)}>
                      Почему такой индекс?
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Открытых задач нет"
          description="Выберите другой проект или создайте новую задачу."
        />
      )}
      <Modal
        open={!!explanation}
        title="Как получен демоиндекс"
        onClose={() => setExplanation(null)}
      >
        {explanation && (
          <>
            <p>
              <strong>{explanation.title}</strong>
            </p>
            <div className="risk-large">
              {demoRisk(explanation)}
              <span>/100</span>
            </div>
            <dl className="details">
              <div>
                <dt>Плановый срок</dt>
                <dd>{formatDate(explanation.dueDate)}</dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{statusLabels[explanation.status]}</dd>
              </div>
              <div>
                <dt>Приоритет</dt>
                <dd>
                  {explanation.priority === 'high'
                    ? 'Высокий'
                    : explanation.priority === 'medium'
                      ? 'Средний'
                      : 'Низкий'}
                </dd>
              </div>
            </dl>
            <p>
              База: просрочка — 80, до суток — 60, до 3 дней — 45, до недели — 25, дальше — 10.
              Высокий приоритет добавляет 15, средний — 5; новая задача — ещё 10. Максимум — 95.
            </p>
            <Notice>
              В будущем этот расчёт заменит проверенная модель ML. Оценка не применяется для
              сравнения сотрудников.
            </Notice>
          </>
        )}
      </Modal>
    </Screen>
  );
}
