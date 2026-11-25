import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useMotionPreference } from '../../../state/useMotionPreference';
import { columns } from '../demoTasks';
import { BOARD, CARD, boardPose, clamp, ease, mixPose, poseTransform, smooth } from './geometry';
import type { BoardPose, Layout, Pose } from './geometry';
import { HeroBoard } from './HeroBoard';
import { HeroGradient } from './HeroGradient';
import {
  arcShape,
  circleShape,
  createCards,
  landedPose,
  lineShape,
  mixShape,
  scatterShape,
  shapePose,
  timeline,
} from './morph';
import type { MorphCard, View } from './morph';
import './hero.css';
import './morph.css';

type Phase = 'intro' | 'arc' | 'board' | 'outro';

const mixBoard = (a: BoardPose, b: BoardPose, t: number): BoardPose => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
  tiltX: a.tiltX + (b.tiltX - a.tiltX) * t,
  tiltZ: a.tiltZ + (b.tiltZ - a.tiltZ) * t,
  scale: a.scale + (b.scale - a.scale) * t,
});

function TaskFace({ card }: { card: MorphCard }) {
  const { task } = card;
  return (
    <div
      className="mh-card"
      style={
        {
          width: CARD.width,
          height: CARD.height,
          '--fill': card.fill,
          '--text': card.text,
        } as CSSProperties
      }
    >
      <div className="mh-flip">
        <div className="mh-face mh-front">
          <span className="mh-code">
            {task.id}
            <i data-status={task.status} />
          </span>
          <strong>{task.title}</strong>
          <span className="mh-meta">
            <i>{task.owner[0].toUpperCase()}</i>
            {task.due}
          </span>
        </div>
        <div className="mh-face mh-back">
          <span className="mh-status" data-status={task.status}>
            <i /> {columns[task.status]}
          </span>
          <dl>
            <div>
              <dt>Исполнитель</dt>
              <dd>{task.owner}</dd>
            </div>
            <div>
              <dt>Срок</dt>
              <dd>{task.due}</dd>
            </div>
          </dl>
          <span className="mh-open">
            Открыть карточку <ArrowRight size={22} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Scene({
  header,
  fixed,
  track,
}: {
  header?: ReactNode;
  fixed?: number;
  track?: RefObject<HTMLElement | null>;
}) {
  const reduced = useMotionPreference();
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const cards = useMemo(() => createCards(compact ? 16 : 20), [compact]);
  const [phase, setPhase] = useState<Phase>(fixed === 1 ? 'outro' : 'intro');
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const change = () => setCompact(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    const host = stage.current,
      viewport = pin.current,
      surface = board.current;
    if (!host || !viewport || !surface) return;
    const view: View & Layout = { width: 1, height: 1, compact, parallax: 0 };
    const count = cards.length;
    // Each card eases toward its target like a soft spring; the state lives here, not in React.
    const current: { pose: Pose; alpha: number }[] = [];
    // Intro runs once on load; a still frame (reduced motion, second frame) starts formed.
    const born = performance.now() - (fixed !== undefined || reduced ? 10000 : 0);
    let last = performance.now();
    let frame = 0;
    let visible = true;
    let current_phase: Phase | null = null;
    let boardNow: BoardPose | null = null;
    let target = 0;
    const follow = !reduced && window.matchMedia('(pointer: fine)').matches;
    function point(event: PointerEvent) {
      target = ((event.clientX / window.innerWidth) * 2 - 1) * 60;
      queue();
    }
    if (follow) window.addEventListener('pointermove', point, { passive: true });

    function progress() {
      if (fixed !== undefined) return fixed;
      const section = track?.current;
      if (!section || !viewport) return 0;
      const distance = Math.max(1, section.offsetHeight - viewport.offsetHeight);
      return clamp(-section.getBoundingClientRect().top / distance);
    }

    function paint(now: number) {
      frame = 0;
      if (!viewport || !surface) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const age = (now - born) / 1000;
      const p = progress();
      const tl = timeline(p);
      view.parallax += (target - view.parallax) * (1 - Math.exp(-dt * 3));
      // Everything eases toward the scroll position with the same soft spring: the cards
      // in flight and the board itself, so the board never jumps ahead of its cards.
      const k = reduced || fixed !== undefined ? 1 : 1 - Math.exp(-dt * 5.5);
      const boardGoal = boardPose(tl.settle, view);
      const settled = boardNow ? mixBoard(boardNow, boardGoal, k) : boardGoal;
      boardNow = settled;
      surface.style.transform =
        `translate3d(${settled.x}px,${settled.y}px,${settled.z}px) ` +
        `rotateX(${settled.tiltX}deg) rotateZ(${settled.tiltZ}deg) scale(${settled.scale})`;
      surface.style.opacity = String(tl.board);

      let moving =
        Math.abs(settled.x - boardGoal.x) + Math.abs(settled.y - boardGoal.y) > 0.4 ||
        Math.abs(settled.scale - boardGoal.scale) > 0.0005;
      cards.forEach((card, i) => {
        const el = els.current[i];
        if (!el) return;
        // Intro on a clock: scattered → a line → the circle. Scroll takes over from there.
        let shape;
        if (age < 0.5) shape = scatterShape(card);
        else if (age < 2.5) shape = lineShape(i, count, view);
        else
          shape = mixShape(
            circleShape(i, count, view),
            arcShape(i, count, view, tl.shuffle),
            tl.morph,
          );
        const m = age < 2.5 ? 0 : ease((tl.land - card.delay) / 0.65);
        const goal = mixPose(shapePose(shape, view), landedPose(card, settled), m);
        let alpha = shape.alpha;
        if (!card.board) {
          // Cards that are not on the board sink into it and disappear.
          const keep = 1 - smooth(m / 0.6);
          goal.sx *= keep;
          goal.sy *= keep;
          alpha *= keep;
        }
        // A low arc on the way to the board.
        goal.y -= Math.sin(Math.PI * m) * view.height * 0.05;
        const state = current[i] ?? { pose: goal, alpha: 0 };
        // The spring stiffens as a card lands: a card on the board is fixed to it and
        // rides along with the (already eased) board instead of trailing behind it.
        const grip = k + (1 - k) * m * m;
        const pose = mixPose(state.pose, goal, grip);
        const a = state.alpha + (alpha - state.alpha) * k;
        if (
          Math.abs(pose.x - goal.x) + Math.abs(pose.y - goal.y) > 0.4 ||
          Math.abs(a - alpha) > 0.01
        )
          moving = true;
        current[i] = { pose, alpha: a };
        el.style.transform = poseTransform(pose);
        el.style.opacity = a.toFixed(3);
        el.style.visibility = a < 0.01 || pose.sx < 0.002 ? 'hidden' : 'visible';
      });

      const appear = fixed !== undefined || reduced ? 1 : smooth((age - 2.6) / 0.8);
      viewport.style.setProperty('--intro', (tl.intro * appear).toFixed(3));
      viewport.style.setProperty('--arc', tl.arc.toFixed(3));
      viewport.style.setProperty('--outro', tl.outro.toFixed(3));
      viewport.style.setProperty('--board', tl.board.toFixed(3));
      const next: Phase =
        tl.outro > 0.5 ? 'outro' : tl.arc > 0.5 ? 'arc' : tl.intro > 0.5 ? 'intro' : 'board';
      if (next !== current_phase) {
        current_phase = next;
        setPhase(next);
      }
      const busy = age < 3.6 || moving || Math.abs(target - view.parallax) > 0.5;
      if (!reduced && visible && busy && !document.hidden) queue();
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function size() {
      if (!host) return;
      view.width = host.clientWidth;
      view.height = host.clientHeight;
      queue();
    }
    const resize = new ResizeObserver(size);
    resize.observe(host);
    const watch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) queue();
    });
    watch.observe(viewport);
    window.addEventListener('scroll', queue, { passive: true });
    document.addEventListener('visibilitychange', queue);
    size();
    return () => {
      resize.disconnect();
      watch.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('pointermove', point);
      document.removeEventListener('visibilitychange', queue);
      cancelAnimationFrame(frame);
    };
  }, [cards, compact, reduced, fixed, track]);

  const showIntro = fixed !== 1;
  const showOutro = fixed !== 0;
  return (
    <div className="rb-pin mh-pin" ref={pin} data-phase={phase}>
      {header}
      <HeroGradient className="rb-gradient" />
      <div className="rb-stage mh-stage" ref={stage}>
        <div className="rb-world" aria-hidden="true">
          <div
            className="rb-board"
            ref={board}
            style={{ width: BOARD.width, height: BOARD.height }}
          >
            <HeroBoard />
          </div>
        </div>
        <div className="rb-world mh-deck" aria-hidden="true">
          {cards.map((card, i) => (
            <div
              key={card.task.id + i}
              className="mh-slot"
              ref={(el) => {
                els.current[i] = el;
              }}
            >
              <TaskFace card={card} />
            </div>
          ))}
        </div>
      </div>
      <div className="rb-frame">
        {showIntro && (
          <>
            <div className="mh-center">
              <h1>
                Команда в одном <span className="rb-accent">ритме.</span>
              </h1>
              <p>Листайте, чтобы продолжить</p>
            </div>
            <div className="mh-arc-copy" inert={phase !== 'arc'}>
              <h2>Каждая задача на виду.</h2>
              <p>
                От первого поручения до принятой работы. Задачи, сроки и решения команды в одном
                месте.
              </p>
              <Link className="rb-cta" to="/login">
                Открыть демоверсию <ArrowRight size={17} />
              </Link>
            </div>
          </>
        )}
        {showOutro && (
          <div className="rb-outro" inert={phase !== 'outro'}>
            <h2>
              Создавайте задачи, ставьте сроки,{' '}
              <span className="rb-accent">назначайте исполнителей.</span>
            </h2>
            <p>
              В карточке — описание, исполнитель, срок и обсуждение. На доске сразу видно, что в
              работе и что ждёт проверки.
            </p>
            <div className="rb-actions">
              <Link className="rb-cta" to="/login">
                Открыть демоверсию <ArrowRight size={17} />
              </Link>
              <a className="rb-link" href="#process">
                Как это работает <ArrowDown size={15} />
              </a>
            </div>
          </div>
        )}
        {fixed === undefined && (
          <span className="rb-cue">
            <ArrowDown size={15} /> Листайте вниз
          </span>
        )}
      </div>
    </div>
  );
}

export function MorphHero({ header }: { header: ReactNode }) {
  const reduced = useMotionPreference();
  const [short, setShort] = useState(() => window.matchMedia('(max-height: 560px)').matches);
  const track = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const query = window.matchMedia('(max-height: 560px)');
    const change = () => setShort(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  // Without scroll-driven motion the story is shown as two still frames.
  if (reduced || short) {
    return (
      <div className="rb-page mh-page" data-static="true">
        <section aria-label="TaskControl">
          <Scene header={header} fixed={0} />
        </section>
        <section aria-label="Задачи на доске">
          <Scene fixed={1} />
        </section>
      </div>
    );
  }
  return (
    <div className="rb-page mh-page">
      <section className="rb-track mh-track" ref={track} aria-label="TaskControl">
        <Scene header={header} track={track} />
      </section>
    </div>
  );
}
