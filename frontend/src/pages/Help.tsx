import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Layers3, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { screenMap } from '../data/screen-map';
import {
  ActionLink,
  Button,
  Confirm,
  Empty,
  Field,
  Notice,
  PageHeading,
  Panel,
  PriorityBadge,
  Screen,
  StatusBadge,
  Tabs,
} from '../components/ui';

export function Help() {
  const { page } = useParams();
  if (page === 'roles') return <Roles />;
  if (page === 'screens') return <Screens />;
  if (page === 'requirements') return <Requirements />;
  if (page === 'states' || page === 'components')
    return <InterfaceStates components={page === 'components'} />;
  return (
    <Screen>
      <PageHeading title="Помощь" description="Как устроено рабочее пространство TaskControl." />
      <div className="help-intro">
        <BookOpen size={33} strokeWidth={1.3} />
        <div>
          <h2>От поручения до принятого результата</h2>
          <p>
            Руководитель создаёт проект и назначает задачу. Сотрудник берёт её в работу и отправляет
            результат на проверку. Руководитель принимает работу или возвращает с комментарием.
          </p>
        </div>
      </div>
      <div className="help-links">
        {[
          ['roles', 'Права ролей', 'Что доступно руководителю, сотруднику и администратору'],
          [
            'screens',
            'Карта экранов',
            'Все 53 экрана исходного макета и их состояния в приложении',
          ],
          ['requirements', 'Покрытие требований', 'Готовые frontend-сценарии и будущие интеграции'],
          ['states', 'Состояния интерфейса', 'Пустые результаты, ошибки и загрузка'],
          ['components', 'Компоненты', 'Кнопки, статусы, формы и подтверждения'],
        ].map(([path, title, description]) => (
          <Link to={`/app/help/${path}`} key={path}>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <ArrowRight size={21} />
          </Link>
        ))}
      </div>
      <Notice>
        Это локальная демонстрация. Данные и файлы хранятся в текущем браузере. Очистка данных сайта
        удаляет локальные изменения. Переключение профилей служит для проверки интерфейса ролей;
        настоящая защита подключается на сервере.
      </Notice>
    </Screen>
  );
}
function Roles() {
  const entries = [
    ['Учётные записи и блокировка', 'Да', 'Нет', 'Нет'],
    ['Отделы и настройки команды', 'Да', 'Нет', 'Нет'],
    ['Создание проектов и задач', 'Нет', 'Свои проекты', 'Нет'],
    ['Просмотр задач', 'Только при назначении', 'Свои проекты', 'Назначенные себе'],
    ['Приёмка и возврат', 'Нет', 'Свои проекты', 'Нет'],
    ['Комментарии и файлы', 'В доступной задаче', 'В доступной задаче', 'В доступной задаче'],
    ['Заказчики и отчёты', 'Нет', 'Да', 'Нет'],
    ['Демонстрация тарифа', 'Нет', 'Да', 'Нет'],
  ];
  return (
    <Screen>
      <PageHeading
        title="Права ролей"
        description="Ответственность и доступные действия в системе."
        back="/app/help"
      />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Действие</th>
              <th>Администратор</th>
              <th>Руководитель</th>
              <th>Сотрудник</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => (
              <tr key={row[0]}>
                {row.map((text, i) =>
                  i === 0 ? (
                    <th scope="row" key={i}>
                      {text}
                    </th>
                  ) : (
                    <td key={i}>{text}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notice>
        <ShieldCheck size={20} />
        <span>
          В демоверсии ограничения действуют в интерфейсе и командах изменения данных. При
          подключении Django сервер должен самостоятельно проверять права каждого запроса. Заказчик
          хранится в справочнике и не имеет отдельной роли входа.
        </span>
      </Notice>
    </Screen>
  );
}
function Screens() {
  return (
    <Screen>
      <PageHeading
        title="Карта экранов"
        description="53 исходных макета: страницы, вкладки, диалоги и состояния."
        back="/app/help"
      />
      <Notice>
        <Layers3 size={19} />
        <span>
          Часть макетов — состояния одного экрана. Например, новая и выполненная задача используют
          общую карточку. Результат зависит от текущих данных и выбранного профиля.
        </span>
      </Notice>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Экран Figma</th>
              <th>Где открыть</th>
            </tr>
          </thead>
          <tbody>
            {screenMap.map(([number, name, path, hint]) => (
              <tr key={number}>
                <td>{number}</td>
                <td>
                  <Link to={path}>{name}</Link>
                </td>
                <td>{hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  );
}
function Requirements() {
  const requirements = [
    [
      'Пользователи и роли',
      'Выбор демопрофилей, создание, редактирование и блокировка пользователей, отделы.',
      'Настоящий вход, восстановление пароля и серверные права.',
    ],
    [
      'Заказчики и проекты',
      'Справочник контактов, проекты, участники, сроки, завершение и архив.',
      'Хранение в PostgreSQL и Django API.',
    ],
    [
      'Задачи и планирование',
      'Создание, редактирование, приоритеты, фильтры, список, Kanban и календарь.',
      'Совместная работа между устройствами.',
    ],
    [
      'Контроль выполнения',
      'История, просрочка, передача на проверку, приёмка и возврат с причиной.',
      'Серверный журнал и фоновые напоминания.',
    ],
    [
      'Комментарии и файлы',
      'Комментарии и локальные файлы до 10 МБ, скачивание и удаление собственного.',
      'Общее файловое хранилище.',
    ],
    [
      'Уведомления',
      'События назначения, комментариев, проверки; прочитано и личные предпочтения.',
      'Push-уведомления, почта и фоновые задачи.',
    ],
    [
      'Аналитика',
      'Текущие состояния, периоды, диаграммы, Excel, печать / PDF.',
      'Серверная история отчётности.',
    ],
    [
      'AI / ML',
      'Явно обозначенная демосводка и индекс по правилам с объяснением.',
      'LLM-инструменты и обученная модель.',
    ],
    [
      'Оплата',
      'Тестовые состояния успеха, ошибки и ожидания, локальный демотариф.',
      'PayPal Sandbox, серверная проверка уведомлений.',
    ],
  ];
  return (
    <Screen>
      <PageHeading
        title="Покрытие требований"
        description="Текущее состояние frontend и границы демонстрации."
        back="/app/help"
      />
      <div className="table-scroll">
        <table className="data-table requirements-table">
          <thead>
            <tr>
              <th>Раздел</th>
              <th>Работает локально</th>
              <th>Подключается позже</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((row) => (
              <tr key={row[0]}>
                {row.map((text, i) => (
                  <td key={i}>{text}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  );
}
function InterfaceStates({ components = false }: { components?: boolean }) {
  const { notify } = useWorkspace();
  const [state, setState] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <Screen>
      <PageHeading
        title={components ? 'Компоненты интерфейса' : 'Состояния интерфейса'}
        description="Справочная страница общих элементов и обратной связи."
        back="/app/help"
      />
      {components ? (
        <>
          <Panel title="Кнопки и подтверждения">
            <div className="inline-actions">
              <Button onClick={() => notify('Основное действие выполнено.')}>
                Основное действие
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                Показать подтверждение
              </Button>
              <Button
                variant="ghost"
                onClick={() => notify('Это вспомогательное действие.', 'info')}
              >
                Вспомогательное
              </Button>
              <Button disabled>Недоступное действие</Button>
              <Button
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  timer.current = setTimeout(() => {
                    setLoading(false);
                    notify('Демонстрация загрузки завершена.');
                  }, 900);
                }}
              >
                {loading ? 'Сохраняем…' : 'Показать загрузку'}
              </Button>
            </div>
          </Panel>
          <Panel title="Статусы и приоритеты">
            <div className="inline-actions">
              <StatusBadge status="new" />
              <StatusBadge status="in_progress" />
              <StatusBadge status="in_review" />
              <StatusBadge status="done" />
              <PriorityBadge priority="low" />
              <PriorityBadge priority="medium" />
              <PriorityBadge priority="high" />
            </div>
          </Panel>
          <Panel title="Поля формы">
            <div className="form-grid">
              <Field label="Название">
                <input placeholder="Название задачи" />
              </Field>
              <Field label="Исполнитель">
                <select defaultValue="">
                  <option value="" disabled>
                    Выберите сотрудника
                  </option>
                  <option>rr0semary</option>
                </select>
              </Field>
            </div>
          </Panel>
        </>
      ) : (
        <>
          <Tabs
            options={[
              { value: 'normal', label: 'Готово' },
              { value: 'empty', label: 'Пусто' },
              { value: 'loading', label: 'Загрузка' },
              { value: 'error', label: 'Ошибка' },
            ]}
            value={state}
            onChange={setState}
          />
          <Panel title="Предпросмотр состояния">
            {state === 'normal' ? (
              <Notice tone="success">
                <Check size={19} />
                Данные загружены, можно продолжать работу.
              </Notice>
            ) : state === 'empty' ? (
              <Empty
                title="Задач пока нет"
                description="Создайте первую задачу или измените условия поиска."
                action={<ActionLink to="/app/tasks">Открыть задачи</ActionLink>}
              />
            ) : state === 'loading' ? (
              <div className="skeleton-list" aria-busy="true" aria-label="Пример загрузки">
                <div />
                <div />
                <div />
              </div>
            ) : (
              <Notice tone="warning">
                <div>
                  <strong>Не удалось загрузить данные</strong>
                  <p>Проверьте подключение и повторите действие.</p>
                  <Button variant="secondary" onClick={() => setState('normal')}>
                    Повторить загрузку
                  </Button>
                </div>
              </Notice>
            )}
          </Panel>
        </>
      )}
      <Confirm
        open={confirm}
        title="Подтвердить действие?"
        description="Это пример диалогового окна. Рабочие данные не изменятся."
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          notify('Подтверждение получено.');
        }}
      />
    </Screen>
  );
}
