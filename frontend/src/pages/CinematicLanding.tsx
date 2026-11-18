import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Maximize2,
  Moon,
  Square,
  Play,
  Sun,
} from 'lucide-react';
import { Brand } from '../components/ui';
import { DocumentScreen } from '../components/cinematic/DocumentScreen';
import { chapterAt, chapters, screenFocus } from '../components/cinematic/timeline';
import { useTheme, setTheme } from '../state/theme';
import { useMotionPreference } from '../state/useMotionPreference';
import '../components/cinematic/cinematic.css';

const CinematicScene = lazy(() => import('../components/cinematic/CinematicScene'));
class SceneGuard extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CinematicLanding({ embedded = false }: { embedded?: boolean }) {
  const story = useRef<HTMLElement>(null);
  const managerMonitor = useRef<HTMLDivElement>(null);
  const employeeMonitor = useRef<HTMLDivElement>(null);
  const navigating = useRef(false);
  const navigationPlayback = useRef<{ stop: () => void } | null>(null);
  const meetingPlayback = useRef<{ stop: () => void } | null>(null);
  const [meetingPlaying, setMeetingPlaying] = useState(false);
  const visible = useInView(story);
  const hasEntered = useInView(story, { once: true });
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [chapter, setChapter] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [simple, setSimple] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const sceneRequested = !embedded || hasEntered;
  const theme = useTheme();
  const reduced = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: story, offset: ['start start', 'end end'] });
  const scrollPhase = useTransform(scrollYProgress, [0, 1], [0, 5]);
  const easedPhase = useSpring(scrollPhase, { stiffness: 120, damping: 28, mass: 0.8 });
  const phase = reduced ? scrollPhase : easedPhase;
  useMotionValueEvent(phase, 'change', (p) => {
    setChapter(chapterAt(p));
    setScreenActive(screenFocus(p) > 0.99);
  });
  useEffect(() => {
    const listener = () => {
      setTabVisible(!document.hidden);
      if (document.hidden) {
        navigationPlayback.current?.stop();
        navigationPlayback.current = null;
        meetingPlayback.current?.stop();
        meetingPlayback.current = null;
        setMeetingPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  useEffect(() => {
    const interrupt = () => {
      navigationPlayback.current?.stop();
      navigationPlayback.current = null;
      meetingPlayback.current?.stop();
      meetingPlayback.current = null;
      setMeetingPlaying(false);
      if (!navigating.current) return;
      navigating.current = false;
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.key === ' ' &&
        event.target instanceof HTMLElement &&
        event.target.closest('button, a, input, textarea, select')
      )
        return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        interrupt();
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      meetingPlayback.current?.stop();
      navigationPlayback.current?.stop();
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('keydown', key);
    };
  }, []);
  function goTo(index: number) {
    navigationPlayback.current?.stop();
    navigationPlayback.current = null;
    meetingPlayback.current?.stop();
    meetingPlayback.current = null;
    setMeetingPlaying(false);
    const element = story.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    const travel = element.offsetHeight - window.innerHeight;
    const target = chapters[index].at;
    const from = Math.max(0, Math.min(5, ((window.scrollY - top) / travel) * 5));
    navigating.current = !reduced;
    if (reduced) {
      window.scrollTo({ top: top + (travel * target) / 5, behavior: 'instant' });
    } else {
      navigationPlayback.current = animate(from, target, {
        duration: Math.max(0.7, Math.min(3.5, Math.abs(target - from) * 2)),
        ease: [0.45, 0, 0.2, 1],
        onUpdate: (value) =>
          window.scrollTo({ top: top + (travel * value) / 5, behavior: 'instant' }),
        onComplete: () => {
          navigating.current = false;
          navigationPlayback.current = null;
        },
      });
    }
  }
  function replayMeeting() {
    navigationPlayback.current?.stop();
    navigationPlayback.current = null;
    meetingPlayback.current?.stop();
    meetingPlayback.current = null;
    if (meetingPlaying) {
      setMeetingPlaying(false);
      return;
    }
    const element = story.current;
    if (!element) return;
    if (reduced) {
      goTo(5);
      return;
    }
    const top = element.getBoundingClientRect().top + window.scrollY;
    const travel = element.offsetHeight - window.innerHeight;
    navigating.current = false;
    setMeetingPlaying(true);
    meetingPlayback.current = animate(4.45, chapters[5].at, {
      duration: 6,
      ease: 'linear',
      onUpdate: (value) =>
        window.scrollTo({ top: top + (travel * value) / 5, behavior: 'instant' }),
      onComplete: () => {
        meetingPlayback.current = null;
        setMeetingPlaying(false);
      },
    });
  }
  const current = chapters[chapter];
  const simplified = simple || failed;
  const managerInteractive = !simplified && screenActive && chapter !== 2;
  const employeeInteractive = !simplified && screenActive && chapter === 2;
  const Composition = embedded ? 'div' : 'main';
  const OpeningTitle = embedded ? 'h2' : 'h1';
  return (
    <div className="cinematic-page">
      {!embedded && (
        <a className="skip-link" href="#cinematic-controls">
          Перейти к управлению историей
        </a>
      )}
      <section
        className="cine-story"
        id={embedded ? 'process' : undefined}
        ref={story}
        aria-label="История согласования документа"
        data-chapter={chapter}
        data-renderer={simplified ? 'simple' : ready ? 'webgl' : 'loading'}
      >
        <div className="cine-stage">
          <header className="cine-header">
            {embedded ? <strong>Как это работает</strong> : <Brand />}
            <div>
              {embedded ? (
                <a href="#team" className="cine-continue">
                  Для команды <ArrowDown size={14} />
                </a>
              ) : (
                <Link to="/" className="cine-original">
                  <ArrowLeft size={14} /> Главная
                </Link>
              )}
              <button
                className="cine-icon"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
              >
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              {!embedded && (
                <Link className="button button-dark" to="/login">
                  Войти <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </header>
          <Composition className="cine-composition">
            {!embedded && chapter > 0 && (
              <h1 className="sr-only">История одного документа в TaskControl</h1>
            )}
            <div className="cine-narrative" aria-live="polite" aria-atomic="true">
              <motion.div
                className="cine-copy"
                key={chapter}
                initial={reduced ? false : { opacity: 0.7, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.4 }}
              >
                {chapter === 0 ? (
                  <OpeningTitle>{current.title}</OpeningTitle>
                ) : (
                  <h2>{current.title}</h2>
                )}
                <p>{current.description}</p>
                <div className="cine-status">
                  <span className={chapter >= 4 ? 'is-done' : ''}>
                    {chapter >= 4 ? <Check size={13} /> : <i />}
                    {current.status}
                  </span>
                  <small>{current.actor}</small>
                </div>
                {chapter === 0 && (
                  <button className="button button-primary cine-start" onClick={() => goTo(1)}>
                    Пройти путь документа
                    <ArrowRight size={16} />
                  </button>
                )}
                {chapter === 5 && (
                  <Link className="button button-primary cine-start" to="/login">
                    Открыть TaskControl
                    <ArrowRight size={16} />
                  </Link>
                )}
              </motion.div>
              <div className="cine-scroll-hint">
                <ArrowDown size={16} />
                <span>Листай, чтобы продолжить историю</span>
              </div>
            </div>
            <div className="cine-visual" data-screen={screenActive} data-simplified={simplified}>
              <div className="cine-monitor-layer" hidden={simplified}>
                <div
                  ref={managerMonitor}
                  className="cine-live-monitor"
                  data-monitor="manager"
                  inert={!managerInteractive}
                  aria-hidden={!managerInteractive}
                >
                  <DocumentScreen
                    chapter={chapter >= 3 ? Math.min(chapter, 4) : 1}
                    onAdvance={() => goTo(chapter >= 4 ? 5 : chapter === 3 ? 4 : 2)}
                  />
                </div>
                <div
                  ref={employeeMonitor}
                  className="cine-live-monitor"
                  data-monitor="employee"
                  inert={!employeeInteractive}
                  aria-hidden={!employeeInteractive}
                >
                  <DocumentScreen chapter={chapter >= 3 ? 3 : 2} onAdvance={() => goTo(3)} />
                </div>
              </div>
              {sceneRequested && !simplified && (
                <SceneGuard onFailure={() => setFailed(true)}>
                  <Suspense fallback={null}>
                    <CinematicScene
                      phase={phase}
                      chapter={chapter}
                      theme={theme}
                      active={visible && tabVisible}
                      reduced={reduced}
                      onReady={() => setReady(true)}
                      monitorElements={[managerMonitor, employeeMonitor]}
                    />
                  </Suspense>
                </SceneGuard>
              )}
              {(!ready || simplified) && (
                <div className="cine-scene-placeholder">
                  <FileCheck2 size={54} strokeWidth={1} />
                  <strong>{simplified ? 'Путь документа' : 'Подготавливаем офис…'}</strong>
                  <p>{simplified ? current.status : 'Персонажи, свет и рабочие пространства'}</p>
                  {simplified && (
                    <button
                      className="button button-secondary"
                      onClick={() => goTo(Math.min(chapter + 1, 5))}
                    >
                      Следующий этап
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}
              {simplified && chapter >= 1 && chapter <= 4 && (
                <div className="cine-screen-fallback">
                  <DocumentScreen
                    chapter={chapter}
                    onAdvance={() => goTo(Math.min(chapter + 1, 5))}
                  />
                </div>
              )}
              <div className="cine-visual-bottom">
                {chapter === 5 && !simplified && !reduced ? (
                  <button
                    onClick={replayMeeting}
                    aria-label={meetingPlaying ? 'Остановить встречу' : 'Посмотреть встречу'}
                  >
                    {meetingPlaying ? <Square size={13} /> : <Play size={13} />}
                    {meetingPlaying ? 'Остановить' : 'Посмотреть встречу'}
                  </button>
                ) : (
                  <span>
                    <i />
                    {chapter === 5 ? 'Результат, который объединяет' : 'Концепция портала.pdf'}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (failed) {
                      window.location.reload();
                      return;
                    }
                    if (simplified) {
                      setFailed(false);
                      setReady(false);
                      setSimple(false);
                    } else {
                      meetingPlayback.current?.stop();
                      meetingPlayback.current = null;
                      setMeetingPlaying(false);
                      setSimple(true);
                    }
                  }}
                  aria-pressed={simplified}
                >
                  <Maximize2 size={13} />
                  {simplified ? 'Показать 3D' : 'Упрощённый вид'}
                </button>
              </div>
            </div>
          </Composition>
          <nav
            className="cine-timeline"
            id="cinematic-controls"
            aria-label="Этапы согласования документа"
          >
            <div className="cine-progress">
              <motion.i style={{ scaleX: scrollYProgress }} />
            </div>
            {chapters.map((item, index) => (
              <button
                key={item.nav}
                onClick={() => goTo(index)}
                aria-current={chapter === index ? 'step' : undefined}
              >
                <span>{chapter > index ? <Check size={13} /> : `0${index + 1}`}</span>
                <strong>{item.nav}</strong>
              </button>
            ))}
          </nav>
          <div className="cine-footer-note">
            <span>TaskControl · История одного документа</span>
            <span>Интерактивная демонстрация процесса</span>
          </div>
        </div>
      </section>
      {!embedded && (
        <footer className="cine-end">
          <Brand />
          <Link to="/workflow#process">
            Предыдущая 3D-сцена <ArrowRight size={16} />
          </Link>
        </footer>
      )}
    </div>
  );
}
