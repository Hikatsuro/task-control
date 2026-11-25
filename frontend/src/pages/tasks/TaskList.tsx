import { Plus } from 'lucide-react';
import { TaskTable } from '../../components/TaskTable';
import { ActionLink, PageHeading, Screen, Tabs } from '../../components/ui';
import { TaskFilters } from './TaskFilters';
import { useFilteredTasks } from './useFilteredTasks';

export function Tasks() {
  const { user, tasks, params, change } = useFilteredTasks();
  if (!user) return null;
  return (
    <Screen>
      <PageHeading
        title={params.get('mine') === '1' || user.role === 'employee' ? 'Мои задачи' : 'Задачи'}
        action={
          user.role === 'manager' && (
            <ActionLink to="/app/tasks/new">
              <Plus size={18} />
              Создать задачу
            </ActionLink>
          )
        }
      />
      {user.role === 'manager' && (
        <Tabs
          label="Область задач"
          options={[
            { value: '', label: 'Все задачи' },
            { value: '1', label: 'Назначенные мне' },
          ]}
          value={params.get('mine') ?? ''}
          onChange={(value) => change('mine', value)}
        />
      )}
      <TaskFilters view="list" />
      <div className="results-count">Найдено задач: {tasks.length}</div>
      <TaskTable tasks={tasks} />
    </Screen>
  );
}
