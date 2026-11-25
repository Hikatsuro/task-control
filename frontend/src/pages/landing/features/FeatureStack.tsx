import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Check, CornerDownLeft, FileText, MoveUpRight, Paperclip } from 'lucide-react';
import { useMotionPreference } from '../../../state/useMotionPreference';
import { columns, tasks } from '../demoTasks';
import './feature-stack.css';

const features = [
  {
    title: 'Проекты и сроки',
    text: 'Объединяй задачи в проекты. Назначай участников и планируй работу на доске и в календаре.',
    meta: 'Список / Kanban / Календарь',
  },
  {
    title: 'Задачи и обсуждение',
    text: 'Описание, исполнитель, приоритет, комментарии и файлы находятся в одной карточке.',
    meta: 'Поручение / Контекст / Результат',
  },
  {
    title: 'Контроль и приёмка',
    text: 'Проверяй выполненную работу, возвращай на доработку и следи за сроками проекта.',
    meta: 'Проверка / История / Отчёт',
  },
] as const;

/* Small, honest previews of the real workspace, drawn in HTML so they stay sharp and
   follow the theme. They are decoration for the card; the card itself is the link. */

function BoardPreview() {
  return (
    <div className="fs-screen">
      <div className="fs-screen-bar">
        <b>Корпоративный портал</b>
        <span className="fs-tabs">
          <i>Список</i>
          <i data-on>Kanban</i>
          <i>Календарь</i>
        </span>
      </div>
      <div className="fs-board">
        {columns.map((column, status) => (
          <div key={column} className="fs-column">
            <span className="fs-column-title" data-status={status}>
              <i />
              {column}
            </span>
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <span key={task.id} className="fs-mini-card">
                  <small>{task.id}</small>
                  {task.title}
                  <em>{task.due}</em>
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskPreview() {
  const task = tasks[2];
  return (
    <div className="fs-screen">
      <div className="fs-screen-bar">
        <span className="fs-code">
          <FileText size={14} /> {task.id}
        </span>
        <span className="fs-chip" data-status="2">
          На проверке
        </span>
      </div>
      <div className="fs-task">
        <strong>{task.title}</strong>
        <dl>
          <div>
            <dt>Исполнитель</dt>
            <dd>
              <i className="fs-avatar" data-person="r">
                R
              </i>{' '}
              {task.owner}
            </dd>
          </div>
          <div>
            <dt>Приоритет</dt>
            <dd>Высокий</dd>
          </div>
          <div>
            <dt>Срок</dt>
            <dd>{task.due}</dd>
          </div>
        </dl>
        <span className="fs-file">
          <Paperclip size={14} /> Концепция портала.pdf
        </span>
        <div className="fs-comments">
          <p>
            <i className="fs-avatar" data-person="h">
              H
            </i>
            <span>
              <b>Hikatsuro</b> Сверь, пожалуйста, разделы с брифом.
            </span>
          </p>
          <p>
            <i className="fs-avatar" data-person="r">
              R
            </i>
            <span>
              <b>rr0semary</b> Готово, замечания учла. Отправляю на проверку.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewPreview() {
  const history = [
    { who: 'Hikatsuro', what: 'назначил задачу', when: '18 ноя' },
    { who: 'rr0semary', what: 'отправила на проверку', when: '20 ноя' },
    { who: 'Hikatsuro', what: 'вернул на доработку', when: '20 ноя', back: true },
    { who: 'Hikatsuro', what: 'принял результат', when: '21 ноя', done: true },
  ];
  return (
    <div className="fs-screen">
      <div className="fs-screen-bar">
        <b>Проверить документ</b>
        <span className="fs-chip" data-status="3">
          <Check size={12} /> Выполнена
        </span>
      </div>
      <div className="fs-review">
        <div className="fs-actions">
          <span className="fs-accept">
            <Check size={15} /> Принять
          </span>
          <span className="fs-return">
            <CornerDownLeft size={15} /> Вернуть на доработку
          </span>
        </div>
        <ol className="fs-history">
          {history.map((item) => (
            <li key={item.what} data-back={item.back} data-done={item.done}>
              <i />
              <span>
                <b>{item.who}</b> {item.what}
              </span>
              <small>{item.when}</small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const previews = [BoardPreview, TaskPreview, ReviewPreview];

export function FeatureStack() {
  const reduced = useMotionPreference();
  const heading = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  // One entrance for the heading, as in the reference: it rises in when the section arrives.
  useEffect(() => {
    const el = heading.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // As the next card slides over, the one beneath settles back a little and dims,
  // so the stack reads as a pile rather than cards simply overlapping.
  useEffect(() => {
    const host = stack.current;
    if (!host || reduced) return;
    const cards = Array.from(host.querySelectorAll<HTMLElement>('.fs-card'));
    let frame = 0;
    function paint() {
      frame = 0;
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const stick = parseFloat(getComputedStyle(card).top) || 0;
        const distance = next.getBoundingClientRect().top - stick;
        const cover = Math.min(1, Math.max(0, 1 - distance / card.offsetHeight));
        card.style.setProperty('--cover', cover.toFixed(3));
      });
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    paint();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      cancelAnimationFrame(frame);
      cards.forEach((card) => card.style.removeProperty('--cover'));
    };
  }, [reduced]);

  return (
    <section className="landing-features fs-section" id="features">
      <div
        className="landing-section-heading fs-heading"
        ref={heading}
        data-shown={reduced || shown}
      >
        <h2>
          Работа движется.
          <br />
          <span>Детали остаются на месте.</span>
        </h2>
        <p>
          Проекты, задачи и обсуждения связаны между собой. Открывай нужный контекст одним
          переходом.
        </p>
      </div>
      <div className="fs-stack" ref={stack}>
        {features.map((feature, i) => {
          const Preview = previews[i];
          return (
            <Link
              to="/login"
              className="fs-card"
              data-tone={i}
              key={feature.title}
              style={{ '--i': i } as CSSProperties}
            >
              <div className="fs-copy">
                <span className="feature-index">0{i + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span className="fs-meta">
                  {feature.meta}
                  <MoveUpRight size={22} />
                </span>
              </div>
              <div className="fs-preview" aria-hidden="true">
                <Preview />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
