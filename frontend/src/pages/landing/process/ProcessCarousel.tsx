import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  ClipboardList,
  CornerDownLeft,
  FileSpreadsheet,
  PenLine,
  ScanSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMotionPreference } from '../../../state/useMotionPreference';
import './process.css';

interface Stage {
  number: string;
  title: string;
  text: string;
  status: string;
  tone: number; // 0..3 → status colour
  icon: LucideIcon;
}

// The life of one task, in the words the product already uses.
const stages: Stage[] = [
  {
    number: '001',
    title: 'Назначение',
    text: 'Руководитель определяет результат, назначает сотрудника и задаёт срок. Всё необходимое уже в карточке.',
    status: 'Новая',
    tone: 0,
    icon: ClipboardList,
  },
  {
    number: '002',
    title: 'Выполнение',
    text: 'Сотрудник готовит результат. Текст, вложения и обсуждение остаются рядом с поручением.',
    status: 'В работе',
    tone: 1,
    icon: PenLine,
  },
  {
    number: '003',
    title: 'Проверка',
    text: 'Руководитель открывает документ, сверяет результат с заданием и оставляет конкретное замечание.',
    status: 'На проверке',
    tone: 2,
    icon: ScanSearch,
  },
  {
    number: '004',
    title: 'Доработка',
    text: 'Если нужны правки, задача возвращается в работу вместе с замечанием. История сохраняет каждое решение.',
    status: 'В работе',
    tone: 1,
    icon: CornerDownLeft,
  },
  {
    number: '005',
    title: 'Приёмка',
    text: 'Замечание учтено. Руководитель принимает документ, и задача переходит в «Выполнена».',
    status: 'Выполнена',
    tone: 3,
    icon: CheckCheck,
  },
  {
    number: '006',
    title: 'Отчёт',
    text: 'Принятая работа попадает в отчёт по проекту. Отчёт можно выгрузить в Excel.',
    status: 'Выполнена',
    tone: 3,
    icon: FileSpreadsheet,
  },
];

export function ProcessCarousel() {
  const reduced = useMotionPreference();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [shown, setShown] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  // Cards rise in one after another the first time the section arrives.
  useEffect(() => {
    const el = section.current;
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

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 4,
      end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // One step is one card plus the gap, so the buttons always land on a card edge.
  function go(direction: 1 | -1) {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('.pc-card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: reduced ? 'auto' : 'smooth',
    });
  }
  // Drag with the mouse. Touch and trackpads already scroll natively; this adds the same
  // for a mouse: grab, throw, and the track settles on the nearest card.
  const drag = useRef({
    active: false,
    moved: false,
    startX: 0,
    startLeft: 0,
    lastX: 0,
    lastT: 0,
    v: 0,
  });
  function down(event: PointerEvent<HTMLOListElement>) {
    const el = track.current;
    if (!el || event.pointerType !== 'mouse' || event.button !== 0) return;
    el.setPointerCapture(event.pointerId);
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startLeft: el.scrollLeft,
      lastX: event.clientX,
      lastT: event.timeStamp,
      v: 0,
    };
    el.dataset.dragging = 'true';
  }
  function move(event: PointerEvent<HTMLOListElement>) {
    const el = track.current;
    const d = drag.current;
    if (!el || !d.active) return;
    const dx = event.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.startLeft - dx;
    const dt = Math.max(1, event.timeStamp - d.lastT);
    d.v = 0.8 * d.v + 0.2 * ((event.clientX - d.lastX) / dt);
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;
  }
  function up(event: PointerEvent<HTMLOListElement>) {
    const el = track.current;
    const d = drag.current;
    if (!el || !d.active) return;
    d.active = false;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    delete el.dataset.dragging;
    const card = el.querySelector<HTMLElement>('.pc-card');
    if (!card) return;
    const step = card.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);
    // A quick flick carries on a little before it settles, at most one card further.
    const fling = Math.max(-step, Math.min(step, d.v * 260));
    const thrown = el.scrollLeft - fling;
    const max = el.scrollWidth - el.clientWidth;
    const target = Math.min(max, Math.max(0, Math.round(thrown / step) * step));
    el.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
  }
  function click(event: MouseEvent) {
    // A drag that ends over a card is not a click.
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  }

  function key(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  }

  return (
    <section
      className="pc-section"
      id="process"
      ref={section}
      data-shown={reduced || shown}
      aria-labelledby="process-title"
    >
      <div className="landing-section-heading pc-heading">
        <h2 id="process-title">
          Как это работает.
          <br />
          <span>От поручения до приёмки.</span>
        </h2>
        <div className="pc-controls">
          <p>Один путь для всей команды. Каждое действие остаётся в истории задачи.</p>
          <div className="pc-buttons">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={edges.start}
              aria-label="Предыдущий этап"
              aria-controls="process-track"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={edges.end}
              aria-label="Следующий этап"
              aria-controls="process-track"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <ol
        className="pc-track"
        id="process-track"
        ref={track}
        tabIndex={0}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={click}
        onDragStart={(event) => event.preventDefault()}
        aria-label="Этапы задачи. Листайте стрелками влево и вправо"
      >
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <li
              key={stage.number}
              className="pc-card"
              data-tone={i % 6}
              style={{ '--i': i } as CSSProperties}
              aria-label={`${stage.number}. ${stage.title}`}
            >
              <div className="pc-top">
                <span className="pc-number">( {stage.number} )</span>
                <span className="pc-status" data-status={stage.tone}>
                  <i />
                  {stage.status}
                </span>
              </div>
              <Icon className="pc-icon" size={48} strokeWidth={1.5} aria-hidden="true" />
              <div className="pc-copy">
                <h3>{stage.title}</h3>
                <p>{stage.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="pc-footer">
        <Link className="button button-primary" to="/login">
          Открыть демоверсию <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
