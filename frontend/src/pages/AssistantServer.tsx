import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Info, LoaderCircle, Send, Sparkles } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { DjangoError, write } from '../data/django';
import { availableProjects } from '../domain/model';
import { Button, Field, Notice, PageHeading, Panel, Screen } from '../components/ui';

/* AI-помощник with Django: the server asks the local model (Ollama) for a project summary.
   The model calls the task-reading tool itself. Totals and the tasks that need attention are
   counted by the server and always exact; the model writes the conclusion. */

type Totals = Record<string, number>;
type Attention = { title: string; assignee: string; reason: string; url: string };
type SummaryResponse = {
  summary: string;
  model: string;
  totals: Totals | null;
  attention: Attention[];
};

function AttentionList({ items }: { items: Attention[] }) {
  if (!items.length)
    return <p className="ai-attention-empty">Просроченных задач и задач на проверке нет.</p>;
  return (
    <ul className="ai-attention" aria-label="Требуют внимания">
      {items.map((item) => {
        const path = cardPath(item.url);
        return (
          <li key={item.url}>
            {path ? <Link to={path}>{item.title}</Link> : item.title}
            <span>
              {item.assignee} · {item.reason}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const tasksWord = (n: number) => {
  const tens = n % 100,
    ones = n % 10;
  if (tens >= 11 && tens <= 14) return 'задач';
  return ones === 1 ? 'задача' : ones >= 2 && ones <= 4 ? 'задачи' : 'задач';
};

// Exact numbers counted by the server; the model only explains them.
function TotalsLine({ totals }: { totals: Totals }) {
  const parts = Object.entries(totals).filter(([key, value]) => key !== 'всего' && value > 0);
  const total = totals['всего'] ?? 0;
  return (
    <p className="ai-totals">
      <b>
        {total} {tasksWord(total)}
      </b>
      {parts.map(([key, value]) => (
        <span key={key} data-late={key === 'просрочено' || undefined}>
          {key} — {value}
        </span>
      ))}
    </p>
  );
}

// Only links to task cards become links; anything else stays plain text.
const cardPath = (url: string) => {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return /^\/app\/tasks\/\d+$/.test(path) ? path : null;
  } catch {
    return null;
  }
};

/** A small Markdown subset: [text](url), **bold**, list markers and line breaks. */
function renderInline(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    if (match[1]) {
      const path = cardPath(match[2]);
      parts.push(
        path ? (
          <Link key={match.index} to={path}>
            {match[1]}
          </Link>
        ) : (
          match[1]
        ),
      );
    } else parts.push(<strong key={match.index}>{match[3]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

function SummaryText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="ai-summary">
      {lines.map((line, i) => {
        const item = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (!line.trim()) return <Fragment key={i} />;
        return item ? (
          <p key={i} className="ai-summary-item">
            {renderInline(item[1])}
          </p>
        ) : (
          <p key={i}>{renderInline(line.replace(/^#+\s*/, ''))}</p>
        );
      })}
    </div>
  );
}

// What the server limits: a longer question or history is refused (core/assistant.py).
const MAX_QUESTION = 1000;
const MAX_HISTORY = 12;

const toolNames: Record<string, string> = {
  list_projects: 'список проектов',
  get_project_tasks: 'задачи проекта',
  get_all_tasks: 'задачи всех проектов',
  get_task: 'карточка задачи',
};

type ChatEntry =
  | { id: number; kind: 'question'; text: string }
  | { id: number; kind: 'answer'; text: string; model: string; tools: string[] }
  | { id: number; kind: 'summary'; project: string; result: SummaryResponse };

const examples = [
  'Что сейчас просрочено?',
  'Какие задачи ждут моей проверки?',
  'У кого больше всего открытых задач?',
];

/** History for the model: questions and answers as text; a summary counts as its conclusion. */
function historyOf(entries: ChatEntry[], question: string) {
  const turns = entries.map((e) =>
    e.kind === 'question'
      ? { role: 'user' as const, content: e.text }
      : {
          role: 'assistant' as const,
          content:
            e.kind === 'answer' ? e.text : `Сводка по проекту «${e.project}»: ${e.result.summary}`,
        },
  );
  return [...turns, { role: 'user' as const, content: question }]
    .slice(-MAX_HISTORY)
    .map((m) => ({ ...m, content: m.content.slice(0, 4000) }))
    .filter((m, i, list) => i > 0 || m.role === 'user' || list.length === 1);
}

export function ServerAssistant() {
  const { data, user } = useWorkspace();
  const projects = user ? availableProjects(data, user) : [];
  const [project, setProject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<'chat' | 'summary' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  if (!user) return null;
  const projectName = projects.find((p) => p.id === project)?.name;

  async function run<T>(kind: 'chat' | 'summary', request: () => Promise<T>, done: (r: T) => void) {
    setBusy(kind);
    setError(null);
    try {
      done(await request());
    } catch (cause) {
      setError(cause instanceof DjangoError ? cause.message : 'Не удалось связаться с сервером.');
    } finally {
      // The field stays enabled while the model thinks (the next question can be typed; only
      // sending waits), so focus can go back to it.
      setBusy(null);
      inputRef.current?.focus();
    }
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = historyOf(entries, question);
    setEntries((items) => [...items, { id: Date.now(), kind: 'question', text: question }]);
    setPrompt('');
    void run(
      'chat',
      () =>
        write<{ answer: string; model: string; tools: string[] }>('/assistant/chat/', 'POST', {
          messages: history,
          project_id: project ? Number(project) : null,
        }),
      (r) =>
        setEntries((items) => [
          ...items,
          { id: Date.now(), kind: 'answer', text: r.answer, model: r.model, tools: r.tools },
        ]),
    );
  }

  function summarize() {
    if (!project || busy) return;
    const name = projectName ?? '';
    void run(
      'summary',
      () =>
        write<SummaryResponse>('/assistant/summary/', 'POST', {
          project_id: Number(project),
        }),
      (result) =>
        setEntries((items) => [
          ...items,
          { id: Date.now(), kind: 'summary', project: name, result },
        ]),
    );
  }

  return (
    <Screen>
      <PageHeading title="AI-помощник" />
      <Notice>
        <Info size={18} />
        <span>
          Отвечает языковая модель, запущенная на этом компьютере через Ollama. Она видит только
          задачи, доступные вам в кабинете, сама запрашивает их у сервера и ничего не меняет.
        </span>
      </Notice>
      <div className="assistant-layout">
        <Panel className="chat-panel">
          <div className="chat-heading">
            <Bot size={22} />
            <div>
              <h2>Помощник команды</h2>
              <span>
                {projectName ? `Проект «${projectName}»` : 'Все ваши проекты'} · только чтение
              </span>
            </div>
            {entries.length > 0 && (
              <Button variant="ghost" disabled={!!busy} onClick={() => setEntries([])}>
                Новый диалог
              </Button>
            )}
          </div>
          <div className="chat-messages" aria-live="polite">
            {entries.length === 0 && !busy && (
              <div className="chat-welcome">
                <h2>Спросите о задачах и проектах</h2>
                <p>
                  Помощник сам найдёт нужные проекты, задачи, комментарии и историю. Он отвечает
                  только по данным TaskControl и ничего не меняет.
                </p>
                <div className="prompt-examples">
                  {examples.map((text) => (
                    <button key={text} type="button" onClick={() => ask(text)}>
                      {text}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {entries.map((e) =>
              e.kind === 'question' ? (
                <article key={e.id} className="chat-message chat-user">
                  <span>{user.name}</span>
                  <p className="preserve-lines">{e.text}</p>
                </article>
              ) : e.kind === 'answer' ? (
                <article key={e.id} className="chat-message chat-assistant">
                  <span>
                    TaskControl · AI · {e.model}
                    {e.tools.length > 0 &&
                      ` · данные: ${[...new Set(e.tools)].map((t) => toolNames[t] ?? t).join(', ')}`}
                  </span>
                  <SummaryText text={e.text} />
                </article>
              ) : (
                <article key={e.id} className="chat-message chat-assistant">
                  <span>Сводка по проекту «{e.project}»</span>
                  {e.result.totals && <TotalsLine totals={e.result.totals} />}
                  <h3 className="ai-heading">Требуют внимания</h3>
                  <AttentionList items={e.result.attention ?? []} />
                  <h3 className="ai-heading">Вывод модели · {e.result.model}</h3>
                  <SummaryText text={e.result.summary} />
                </article>
              ),
            )}
            {busy && (
              <article className="chat-message chat-assistant ai-thinking">
                <span>TaskControl · AI</span>
                <p>
                  <LoaderCircle size={16} className="spin" />
                  {busy === 'summary'
                    ? ' Модель читает задачи проекта и пишет сводку.'
                    : ' Модель ищет данные и готовит ответ.'}{' '}
                  Это может занять до минуты.
                </p>
              </article>
            )}
            {error && <Notice tone="warning">{error}</Notice>}
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              ask(prompt);
            }}
          >
            <input
              ref={inputRef}
              aria-label="Вопрос помощнику"
              value={prompt}
              maxLength={MAX_QUESTION}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                projectName
                  ? `Спросите о проекте «${projectName}»…`
                  : 'Спросите о задачах, сроках, исполнителях…'
              }
            />
            <Button type="submit" disabled={!prompt.trim() || !!busy} aria-label="Отправить вопрос">
              <Send size={18} />
            </Button>
          </form>
        </Panel>
        <aside>
          <Panel title="Контекст">
            <Field label="Проект">
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">Все мои проекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button disabled={!project || !!busy} onClick={summarize}>
              <Sparkles size={17} /> {busy === 'summary' ? 'Формируем…' : 'Сводка по проекту'}
            </Button>
            <p>
              Сводка: точные итоги и задачи, требующие внимания, считает сервер, вывод пишет модель.
              В чате можно спросить что угодно о своих задачах.
            </p>
            <Notice>
              Помощник только читает данные: создать, назначить или принять задачу можно в кабинете.
            </Notice>
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}
