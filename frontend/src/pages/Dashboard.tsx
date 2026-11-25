import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { availableProjects, availableTasks, isOverdue, localDate } from '../domain/model';
import { ActionLink, Empty, Notice, PageHeading, Panel, Screen, Stat } from '../components/ui';
import { TaskTable } from '../components/TaskTable';
import { ProjectCard } from './Projects';

export function Dashboard() {
  const { data, user } = useWorkspace();
  if (!user) return null;
  if (user.role === 'admin')
    return (
      <Screen>
        <PageHeading
          title="Управление системой"
          description="Учётные записи, структура команды и настройки."
          action={
            <ActionLink to="/app/users/new">
              <Plus size={18} />
              Добавить пользователя
            </ActionLink>
          }
        />
        <div className="stats-row">
          <Stat value={data.users.length} label="пользователей" to="/app/users" />
          <Stat value={data.users.filter((u) => u.active).length} label="активных профилей" />
          <Stat value={data.departments.length} label="отделов и групп" to="/app/departments" />
        </div>
        <Notice>
          Технический администратор управляет системой. Проекты и задачи доступны руководителям и
          назначенным сотрудникам.
        </Notice>
        <div className="two-columns">
          <Panel title="Пользователи">
            <p>Создавайте учётные записи, назначайте роли и управляйте доступностью профилей.</p>
            <ActionLink to="/app/users" secondary>
              Открыть пользователей <ArrowRight size={17} />
            </ActionLink>
          </Panel>
          <Panel title="Отделы и группы">
            <p>Объединяйте сотрудников по направлениям и поддерживайте структуру команды.</p>
            <ActionLink to="/app/departments" secondary>
              Открыть отделы <ArrowRight size={17} />
            </ActionLink>
          </Panel>
        </div>
      </Screen>
    );
  const tasks = availableTasks(data, user);
  const projects = availableProjects(data, user).filter((p) => p.status === 'active');
  const review = tasks.filter((t) => t.status === 'in_review');
  const attention = tasks
    .filter((t) => t.status !== 'done' && (isOverdue(t) || t.dueDate === localDate()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Screen>
      <PageHeading
        title={user.role === 'manager' ? 'Обзор' : 'Мой рабочий день'}
        action={
          user.role === 'manager' ? (
            <ActionLink to="/app/tasks/new">
              <Plus size={18} />
              Создать задачу
            </ActionLink>
          ) : (
            <ActionLink to="/app/tasks">
              Открыть мои задачи <ArrowRight size={17} />
            </ActionLink>
          )
        }
      />
      <div className="stats-row">
        <Stat
          value={tasks.filter((t) => t.status !== 'done').length}
          label="открытых задач"
          to="/app/tasks"
        />
        <Stat value={review.length} label="на проверке" to="/app/tasks?status=in_review" />
        <Stat
          value={tasks.filter((t) => isOverdue(t)).length}
          label="просрочено"
          accent
          to="/app/tasks?status=overdue"
        />
      </div>
      <div className="dashboard-work">
        <Panel
          title="Требуют внимания"
          action={
            <Link className="text-link" to="/app/tasks?status=overdue">
              Все задачи <ArrowRight size={15} />
            </Link>
          }
        >
          {attention.length ? (
            <TaskTable tasks={attention.slice(0, 5)} compact />
          ) : (
            <Empty
              title="Всё идёт по плану"
              description="На сегодня нет просроченных задач и задач с истекающим сроком."
            />
          )}
        </Panel>
        <Panel title={user.role === 'manager' ? 'Ожидают приёмки' : 'Переданы на проверку'}>
          {review.length ? (
            <div className="review-list">
              {review.slice(0, 4).map((t) => (
                <Link key={t.id} to={`/app/tasks/${t.id}`}>
                  <span className="review-dot" />
                  <div>
                    <strong>{t.title}</strong>
                    <small>{data.users.find((u) => u.id === t.assigneeId)?.name}</small>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Очередь проверки пуста"
              description="Здесь появятся результаты, переданные на проверку."
            />
          )}
        </Panel>
      </div>
      <div className="section-heading">
        <h2>Активные проекты</h2>
        <Link className="text-link" to="/app/projects">
          Все проекты <ArrowRight size={16} />
        </Link>
      </div>
      <div className="projects-grid">
        {projects.slice(0, 2).map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </Screen>
  );
}
