import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, CornerDownRight, MoveUpRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotionPreference } from '../state/useMotionPreference';
import { WorkflowSection } from '../components/workflow3d/WorkflowSection';
import { CinematicLanding } from './CinematicLanding';
import { Brand, Button } from '../components/ui';

const process = [
  { title: 'Поставить задачу', text: 'Hikatsuro назначил исполнителя', status: 'Новая' },
  {
    title: 'Передать результат',
    text: 'rr0semary отправила работу на проверку',
    status: 'На проверке',
  },
  { title: 'Принять работу', text: 'Руководитель подтвердил результат', status: 'Выполнена' },
];
export function Landing({ legacyWorkflow = false }: { legacyWorkflow?: boolean }) {
  const [step, setStep] = useState(0);
  const reduced = useMotionPreference();
  useEffect(() => {
    // The route is lazy-loaded; the browser may resolve the fragment before its target exists.
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'instant' });
  }, []);
  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">
        Перейти к содержимому
      </a>
      <header className="landing-header">
        <Brand />
        <nav aria-label="О системе">
          <a href="#features">Возможности</a>
          <a href="#process">Как это работает</a>
          <a href="#team">Для команды</a>
        </nav>
        <Link className="button button-dark" to="/login">
          Войти <ArrowRight size={16} />
        </Link>
      </header>
      <main id="landing-main">
        <section className="landing-hero" data-enter>
          <div className="hero-copy">
            <motion.h1
              initial={reduced ? false : { y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              КОМАНДА
              <br />В ОДНОМ
              <br />
              <span>РИТМЕ.</span>
            </motion.h1>
            <motion.div
              initial={reduced ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <p className="hero-description">
                Планирование и контроль задач сотрудников.
                <br />
                Понятные поручения. Видимые сроки.
                <br />
                Результат, который проходит проверку.
              </p>
              <Link to="/login" className="button button-primary button-large">
                Открыть демоверсию <ArrowUp />
              </Link>
              <p className="hero-note">3 роли. 4 этапа задачи. Одно рабочее пространство.</p>
            </motion.div>
          </div>
          <motion.div
            className="hero-product"
            initial={reduced ? false : { scale: 0.98, opacity: 0.65 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="product-preview-heading">
              <span>Корпоративный портал</span>
              <span className="preview-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="hero-product-body">
              <div className="preview-caption">Проект команды</div>
              <h2>
                Каждый шаг виден<span className="orange-dot">.</span>
              </h2>
              <div className="preview-progress">
                <motion.span
                  animate={{ scaleX: (step + 1) / 3 }}
                  transition={{ duration: reduced ? 0 : 0.45 }}
                />
              </div>
              <div className="preview-steps">
                {process.map((item, i) => (
                  <button
                    className={`preview-step ${i === step ? 'preview-step-active' : ''} ${i < step ? 'preview-step-done' : ''}`}
                    key={item.title}
                    onClick={() => setStep(i)}
                    aria-pressed={i === step}
                  >
                    <span className="preview-step-number">
                      {i < step ? <Check size={22} /> : `0${i + 1}`}
                    </span>
                    <span className="preview-step-copy">
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                    </span>
                    <span
                      className={`badge status-${i === 2 ? 'done' : i === 1 ? 'in_review' : 'new'}`}
                    >
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
              <div className="preview-result">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="result-number">
                      {step === 2 ? '100' : step === 1 ? '67' : '33'}
                      <small>%</small>
                    </span>
                    <span>
                      {step === 2
                        ? 'Результат принят'
                        : step === 1
                          ? 'Работа на проверке'
                          : 'Задача назначена'}
                    </span>
                  </motion.div>
                </AnimatePresence>
                <Button
                  variant="ghost"
                  onClick={() => setStep((step + 1) % 3)}
                  aria-label="Показать следующий этап"
                >
                  <ArrowRight size={24} />
                </Button>
              </div>
            </div>
            <div className="preview-footer">
              <span>Живой пример процесса</span>
              <span>
                Нажми на любой этап <CornerDownRight size={15} />
              </span>
            </div>
          </motion.div>
          <a href="#features" className="hero-down" aria-label="Посмотреть возможности">
            <ArrowDown size={18} />
            <span>От плана к принятому результату</span>
          </a>
        </section>
        <section className="landing-features" id="features">
          <div className="landing-section-heading">
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
          <div className="feature-rows">
            {[
              [
                'Проекты и сроки',
                'Объединяй задачи в проекты. Назначай участников и планируй работу на доске и в календаре.',
                'Список / Kanban / Календарь',
              ],
              [
                'Задачи и обсуждение',
                'Описание, исполнитель, приоритет, комментарии и файлы находятся в одной карточке.',
                'Поручение / Контекст / Результат',
              ],
              [
                'Контроль и приёмка',
                'Проверяй выполненную работу, возвращай на доработку и следи за сроками проекта.',
                'Проверка / История / Отчёт',
              ],
            ].map(([title, desc, meta], i) => (
              <Link to="/login" className="feature-row" key={title}>
                <span className="feature-index">0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <span className="feature-meta">{meta}</span>
                <MoveUpRight size={26} />
              </Link>
            ))}
          </div>
        </section>
        {legacyWorkflow ? <WorkflowSection /> : <CinematicLanding embedded />}
        <section className="landing-team" id="team">
          <div className="landing-section-heading">
            <h2>
              Каждый видит
              <br />
              свою часть работы.
            </h2>
            <p>Три роли помогают разделить ответственность внутри команды.</p>
          </div>
          <div className="role-columns">
            {[
              ['Руководитель', 'Создаёт проекты, назначает задачи и принимает результат.'],
              [
                'Сотрудник',
                'Видит свои поручения, обсуждает детали и передаёт выполненную работу.',
              ],
              ['Администратор', 'Управляет учётными записями, отделами и настройками системы.'],
            ].map(([title, desc]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <h2>
          От плана
          <br />к результату<span>.</span>
        </h2>
        <div className="landing-footer-bottom">
          <Brand light />
          <span>Учебный проект · Локальная демонстрация</span>
          <Link className="button button-primary" to="/login">
            Открыть демоверсию <ArrowRight size={17} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
function ArrowUp() {
  return <MoveUpRight size={20} />;
}
