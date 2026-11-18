import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
} from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Monitor,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMotionPreference } from '../../state/useMotionPreference';
import { useTheme } from '../../state/theme';
import { stageForPhase, workflowStages } from './workflow';
import './workflow.css';

const OfficeScene = lazy(() => import('./OfficeScene'));

function SimpleWorkflow({ stage, rework }: { stage: number; rework: boolean }) {
  return (
    <div className="workflow-simple" aria-label="Схема движения задачи">
      <div>
        <UserRound size={42} strokeWidth={1.3} />
        <strong>Руководитель</strong>
      </div>
      <ArrowRight className={rework ? 'workflow-return-arrow' : ''} size={30} />
      <div className="workflow-simple-task">
        <FileCheck2 size={32} />
        <strong>Макет проекта</strong>
        <span className={`badge status-${rework ? 'in_progress' : workflowStages[stage].code}`}>
          {rework ? 'На доработке' : workflowStages[stage].status}
        </span>
      </div>
      <ArrowRight size={30} />
      <div>
        <UserRound size={42} strokeWidth={1.3} />
        <strong>Сотрудник</strong>
      </div>
    </div>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
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
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isNear = useInView(sectionRef, { margin: '600px' });
  const isVisible = useInView(sectionRef);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [compact, setCompact] = useState(
    () => window.innerWidth <= 900 || window.innerHeight < 620,
  );
  const [stage, setStage] = useState(0);
  const [rework, setRework] = useState(false);
  const [simple, setSimple] = useState(false);
  const [ready, setReady] = useState(false);
  const reduced = useMotionPreference();
  const theme = useTheme();
  const phase = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (compact) return;
    phase.set(value * 3);
    const nextStage = stageForPhase(value * 3);
    setStage(nextStage);
    // Keep the branch selected during layout adjustments within the review stage.
    if (nextStage !== 2) setRework(false);
  });
  useEffect(() => {
    const query = matchMedia('(max-width: 900px), (max-height: 619px)');
    const resize = () => setCompact(query.matches);
    const visibility = () => setPageVisible(!document.hidden);
    query.addEventListener('change', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query.removeEventListener('change', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  function goToStage(next: number) {
    setRework(false);
    if (compact) {
      phase.set(next);
      setStage(next);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + ((section.offsetHeight - window.innerHeight) * next) / 3,
      behavior: reduced ? 'instant' : 'smooth',
    });
  }
  function showRework() {
    // Stop a pending smooth scroll before opening its alternate review path.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    setRework(true);
  }
  const current = workflowStages[stage];
  const fallback = <SimpleWorkflow stage={stage} rework={rework} />;
  return (
    <section
      id="process"
      ref={sectionRef}
      className="workflow-section"
      aria-labelledby="workflow-heading"
      data-stage={stage}
      data-rework={rework}
    >
      <div className="workflow-sticky">
        <div className="workflow-heading-row">
          <h2 id="workflow-heading">
            От поручения
            <br />
            <span>к результату.</span>
          </h2>
          <p>
            {compact
              ? 'Выбирай этапы и следи за задачей.'
              : 'Листай страницу. Задача движется вместе с тобой.'}
            <ArrowDown size={16} aria-hidden="true" />
          </p>
        </div>
        <div className="workflow-main">
          <div className="workflow-story" aria-live="polite" aria-atomic="true">
            <div className="workflow-state-line">
              <span className="workflow-step-count">0{stage + 1} / 04</span>
              <span className={`badge status-${rework ? 'in_progress' : current.code}`}>
                {rework ? 'На доработке' : current.status}
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={rework ? 'rework' : stage}
                initial={reduced ? false : { opacity: 0.7, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.7 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                <h3>{rework ? 'Замечание становится следующим шагом.' : current.headline}</h3>
                <p>
                  {rework
                    ? 'Руководитель пишет: «Добавить проверку обязательных полей». Карточка возвращается исполнителю с сохранением обсуждения.'
                    : current.description}
                </p>
                <div className="workflow-detail">
                  <span aria-hidden="true" />
                  {rework
                    ? 'Возврат переводит задачу обратно в работу, а не создаёт новую.'
                    : current.detail}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="workflow-branch">
              {stage === 2 && !rework && (
                <button className="button button-secondary" onClick={showRework}>
                  <RotateCcw size={16} />
                  Показать возврат на доработку
                </button>
              )}
              {rework && (
                <button className="button button-secondary" onClick={() => setRework(false)}>
                  <ArrowRight size={16} />
                  Снова на проверку
                </button>
              )}
              {stage === 3 && (
                <Link className="button button-primary" to="/login">
                  Попробовать в системе
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
          <div
            className="workflow-viewport"
            data-renderer={simple ? 'simple' : ready ? 'webgl' : 'loading'}
          >
            <div className="workflow-scene-label">
              <span />
              Демонстрация процесса
            </div>
            {simple || !isNear ? (
              fallback
            ) : (
              <SceneBoundary
                fallback={fallback}
                onFailure={() => {
                  setReady(false);
                  setSimple(true);
                }}
              >
                <Suspense fallback={null}>
                  <OfficeScene
                    phase={phase}
                    stage={stage}
                    rework={rework}
                    theme={theme}
                    active={isVisible && pageVisible}
                    reduced={reduced}
                    onReady={() => setReady(true)}
                  />
                </Suspense>
              </SceneBoundary>
            )}
            {!simple && isNear && !ready && (
              <div
                className="workflow-loading-overlay"
                role="status"
                aria-label="Подготавливаем 3D-сцену"
              >
                {fallback}
              </div>
            )}
            <button
              className="workflow-view-toggle"
              aria-pressed={simple}
              onClick={() => {
                if (simple) setReady(false);
                setSimple(!simple);
              }}
            >
              <Monitor size={14} />
              {simple ? 'Показать 3D' : 'Упрощённый вид'}
            </button>
          </div>
        </div>
        <div className="workflow-controls">
          <div className="workflow-stage-buttons" role="group" aria-label="Этапы задачи">
            {workflowStages.map((item, index) => (
              <button
                key={item.code}
                aria-pressed={stage === index}
                onClick={() => goToStage(index)}
              >
                <span className="workflow-stage-number">
                  {stage > index ? <Check size={16} /> : `0${index + 1}`}
                </span>
                <span>{item.title}</span>
                <span className="workflow-stage-rule" />
              </button>
            ))}
          </div>
          <div className="workflow-next-prev">
            <button
              className="icon-button"
              disabled={stage === 0}
              aria-label="Предыдущий этап"
              onClick={() => goToStage(stage - 1)}
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className="icon-button"
              disabled={stage === 3}
              aria-label="Следующий этап"
              onClick={() => goToStage(stage + 1)}
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
