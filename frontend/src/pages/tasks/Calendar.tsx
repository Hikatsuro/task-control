import { Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskTable } from '../../components/TaskTable';
import { ActionLink, Button, PageHeading, Panel, Screen } from '../../components/ui';
import { formatDate, isOverdue, localDate } from '../../domain/model';
import { TaskFilters } from './TaskFilters';
import { useFilteredTasks } from './useFilteredTasks';

export function Calendar() {
  const { tasks, user } = useFilteredTasks();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(localDate());
  if (!user) return null;
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const count = Math.ceil((startOffset + numberOfDays) / 7) * 7;
  const cells = Array.from({ length: count }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    return day;
  });
  return (
    <Screen>
      <PageHeading
        title="Календарь"
        action={
          user.role === 'manager' && (
            <ActionLink to="/app/tasks/new">
              <Plus size={18} />
              Создать задачу
            </ActionLink>
          )
        }
      />
      <TaskFilters view="calendar" />
      <div className="calendar-toolbar">
        <h2>{formatDate(localDate(month), { month: 'long', year: 'numeric' })}</h2>
        <div className="inline-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              setSelected(localDate());
            }}
          >
            Сегодня
          </Button>
          <Button
            variant="ghost"
            aria-label="Предыдущий месяц"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ←
          </Button>
          <Button
            variant="ghost"
            aria-label="Следующий месяц"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            →
          </Button>
        </div>
      </div>
      <div className="calendar-grid" role="group" aria-label="Даты календаря">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div className="calendar-weekday" key={d}>
            {d}
          </div>
        ))}
        {cells.map((day) => {
          const date = localDate(day);
          const dayTasks = tasks.filter((t) => t.dueDate === date);
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              aria-label={`${formatDate(date, { day: 'numeric', month: 'long' })}, задач: ${dayTasks.length}`}
              aria-pressed={selected === date}
              className={`calendar-cell ${day.getMonth() !== month.getMonth() ? 'calendar-outside' : ''} ${date === localDate() ? 'calendar-today' : ''} ${date === selected ? 'calendar-selected' : ''}`}
            >
              <span>{day.getDate()}</span>
              <div>
                {dayTasks.slice(0, 2).map((t) => (
                  <span
                    className={`calendar-event ${isOverdue(t) ? 'calendar-event-overdue' : ''}`}
                    key={t.id}
                  >
                    {t.title}
                  </span>
                ))}
                {dayTasks.length > 2 && <small>Ещё {dayTasks.length - 2}</small>}
              </div>
            </button>
          );
        })}
      </div>
      <Panel title={`Выбранный день: ${formatDate(selected, { day: 'numeric', month: 'long' })}`}>
        <TaskTable tasks={tasks.filter((t) => t.dueDate === selected)} compact />
      </Panel>
    </Screen>
  );
}
