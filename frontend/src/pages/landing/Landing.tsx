import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Brand } from '../../components/ui';
import { MorphHero } from './hero/MorphHero';
import { FeatureStack } from './features/FeatureStack';
import { ProcessCarousel } from './process/ProcessCarousel';

const roles = [
  ['Руководитель', 'Создаёт проекты, назначает задачи и принимает результат.'],
  ['Сотрудник', 'Видит свои поручения, обсуждает детали и передаёт выполненную работу.'],
  ['Администратор', 'Управляет учётными записями, отделами и настройками системы.'],
];

/** The public home page: hero, features, how it works, roles and the closing call. */
export function Landing() {
  useEffect(() => {
    // The route is lazy-loaded; the browser may resolve the fragment before its target exists.
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'instant' });
  }, []);
  const header = (
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
  );
  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">
        Перейти к содержимому
      </a>
      <main id="landing-main">
        <MorphHero header={header} />
        <FeatureStack />
        <ProcessCarousel />
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
            {roles.map(([title, desc]) => (
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
