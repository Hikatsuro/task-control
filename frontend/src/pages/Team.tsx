import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { availableTasks, newId, requireCondition, roleLabels, roles } from '../domain/model';
import type { Role } from '../domain/model';
import { saveUser } from '../domain/commands';
import {
  ActionLink,
  Avatar,
  Button,
  Confirm,
  Empty,
  Field,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  Screen,
} from '../components/ui';
import { TaskTable } from '../components/TaskTable';

export function Team({ admin = false }: { admin?: boolean }) {
  const { data, user, transact, busy } = useWorkspace();
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [blocking, setBlocking] = useState<string | null>(null);
  if (!user) return null;
  if (admin && user.role !== 'admin') return <NotFound forbidden />;
  const visible = data.users.filter(
    (u) =>
      (admin || u.active) &&
      (!department || u.departmentId === department) &&
      `${u.name} ${u.username} ${u.position}`.toLowerCase().includes(query.toLowerCase()),
  );
  const tasks = availableTasks(data, user);
  return (
    <Screen>
      <PageHeading
        title={admin ? 'Пользователи' : 'Команда'}
        description={
          admin
            ? 'Учётные записи, роли и доступ к системе.'
            : 'Участники, направления работы и текущие поручения.'
        }
        action={
          admin && (
            <ActionLink to="/app/users/new">
              <Plus size={18} />
              Добавить пользователя
            </ActionLink>
          )
        }
      />
      <div className="filter-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Поиск участника"
            placeholder="Имя, логин или направление"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Отдел участника"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">Все отделы</option>
          {data.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {visible.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Участник</th>
                <th>Роль</th>
                <th>Отдел</th>
                <th>{admin ? 'Состояние' : 'Открытые задачи'}</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="person-inline">
                      <Avatar name={member.name} />
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.position}</small>
                      </div>
                    </div>
                  </td>
                  <td>{roleLabels[member.role]}</td>
                  <td>
                    {data.departments.find((d) => d.id === member.departmentId)?.name ??
                      'Не указан'}
                  </td>
                  <td>
                    {admin ? (
                      <span className={`badge ${member.active ? 'status-done' : 'status-overdue'}`}>
                        {member.active ? 'Активен' : 'Заблокирован'}
                      </span>
                    ) : (
                      tasks.filter((t) => t.assigneeId === member.id && t.status !== 'done').length
                    )}
                  </td>
                  <td>
                    <div className="inline-actions">
                      {admin ? (
                        <>
                          <Link className="text-link" to={`/app/users/${member.id}/edit`}>
                            Изменить
                          </Link>
                          {member.id !== user.id && (
                            <Button variant="ghost" onClick={() => setBlocking(member.id)}>
                              {member.active ? 'Блокировать' : 'Разблокировать'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Link
                          className="icon-button"
                          aria-label={`Задачи ${member.name}`}
                          to={`/app/team/${member.id}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Участники не найдены" description="Измените поиск или фильтр отдела." />
      )}
      <Confirm
        open={!!blocking}
        onClose={() => setBlocking(null)}
        title="Изменить доступ пользователя?"
        description="Блокировка отключит вход в демонстрационный профиль. Проекты и история сохранятся."
        busy={busy}
        onConfirm={() => {
          const target = data.users.find((u) => u.id === blocking);
          if (target)
            void transact(
              (d, a) => saveUser(d, a, { ...target, active: !target.active }, target.id),
              'Доступ пользователя обновлён.',
            ).then((ok) => {
              if (ok) setBlocking(null);
            });
        }}
      />
    </Screen>
  );
}
export function MemberDetail() {
  const { id } = useParams();
  const { data, user } = useWorkspace();
  if (!user) return null;
  const member = data.users.find((u) => u.id === id);
  if (!member) return <NotFound />;
  return (
    <Screen>
      <PageHeading title={member.name} description={member.position} back="/app/team" />
      <Panel title="Участник команды">
        <dl className="details details-columns">
          <div>
            <dt>Роль</dt>
            <dd>{roleLabels[member.role]}</dd>
          </div>
          <div>
            <dt>Отдел</dt>
            <dd>{data.departments.find((d) => d.id === member.departmentId)?.name}</dd>
          </div>
          <div>
            <dt>Почта</dt>
            <dd>{member.email}</dd>
          </div>
        </dl>
      </Panel>
      <div className="section-heading">
        <h2>Задачи сотрудника</h2>
      </div>
      <Notice>Показаны только задачи, доступные текущему профилю.</Notice>
      <TaskTable tasks={availableTasks(data, user).filter((t) => t.assigneeId === id)} />
    </Screen>
  );
}
export function UserForm() {
  const { id } = useParams();
  const { data, user, transact, busy } = useWorkspace();
  const navigate = useNavigate();
  if (user?.role !== 'admin') return <NotFound forbidden />;
  const member = data.users.find((u) => u.id === id);
  if (id && !member) return <NotFound />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await transact(
      (d, a) =>
        saveUser(
          d,
          a,
          {
            name: String(f.get('name')),
            username: String(f.get('username')),
            email: String(f.get('email')),
            role: String(f.get('role')) as Role,
            departmentId: String(f.get('departmentId')),
            position: String(f.get('position')),
            active: f.get('active') === 'on',
          },
          id,
        ),
      'Пользователь сохранён.',
    );
    if (ok) navigate('/app/users');
  }
  return (
    <Screen>
      <PageHeading
        title={id ? 'Редактирование пользователя' : 'Создание пользователя'}
        description="Профиль сразу станет доступен в демонстрационном выборе учётных записей."
        back="/app/users"
      />
      <form className="form-single" onSubmit={(e) => void submit(e)}>
        <Panel title="Учётная запись">
          <div className="form-grid">
            <Field label="Отображаемое имя" required>
              <input name="name" required maxLength={80} defaultValue={member?.name} />
            </Field>
            <Field label="Логин" required>
              <input
                name="username"
                required
                minLength={3}
                maxLength={60}
                pattern="[A-Za-z0-9_.-]+"
                title="Латинские буквы, цифры, точка, дефис или подчёркивание"
                defaultValue={member?.username}
              />
            </Field>
            <Field label="Почта" required>
              <input name="email" type="email" required defaultValue={member?.email} />
            </Field>
            <Field label="Роль">
              <select name="role" defaultValue={member?.role ?? 'employee'}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Отдел">
              <select
                name="departmentId"
                defaultValue={member?.departmentId ?? data.departments[0]?.id}
              >
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Направление работы">
              <input name="position" maxLength={120} defaultValue={member?.position} />
            </Field>
          </div>
          <label className="checkbox-line">
            <input type="checkbox" name="active" defaultChecked={member?.active ?? true} />
            Активный профиль
          </label>
          <Notice>
            <ShieldCheck size={18} />
            <span>
              В этой версии пароль не назначается. Настоящий вход и восстановление доступа
              подключаются на сервере.
            </span>
          </Notice>
          <div className="form-actions">
            <ActionLink secondary to="/app/users">
              Отмена
            </ActionLink>
            <Button type="submit" disabled={busy}>
              Сохранить пользователя
            </Button>
          </div>
        </Panel>
      </form>
    </Screen>
  );
}
export function Departments() {
  const { data, user } = useWorkspace();
  if (user?.role !== 'admin') return <NotFound forbidden />;
  return (
    <Screen>
      <PageHeading
        title="Отделы и группы"
        description="Структура рабочей команды."
        action={
          <ActionLink to="/app/departments/new">
            <Plus size={18} />
            Создать отдел
          </ActionLink>
        }
      />
      <div className="departments-grid">
        {data.departments.map((department) => (
          <Panel key={department.id} title={department.name}>
            <p>{department.description}</p>
            <div className="department-members">
              <Users size={18} />
              {data.users.filter((u) => u.departmentId === department.id).length} участника
            </div>
            <Link className="text-link" to={`/app/departments/${department.id}/edit`}>
              Изменить отдел <ArrowUpRight size={16} />
            </Link>
          </Panel>
        ))}
      </div>
    </Screen>
  );
}
export function DepartmentForm() {
  const { id } = useParams();
  const { data, user, transact, busy } = useWorkspace();
  const navigate = useNavigate();
  if (user?.role !== 'admin') return <NotFound forbidden />;
  const department = data.departments.find((d) => d.id === id);
  if (id && !department) return <NotFound />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await transact((d, a) => {
      requireCondition(a.role === 'admin', 'Требуется роль администратора.');
      const name = String(f.get('name')).trim();
      requireCondition(name.length >= 2, 'Укажите название отдела.');
      requireCondition(
        !d.departments.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase()),
        'Такой отдел уже существует.',
      );
      const record = {
        id: id ?? newId('department'),
        name,
        description: String(f.get('description')),
      };
      const selected = f.getAll('members').map(String);
      return {
        ...d,
        departments: id
          ? d.departments.map((x) => (x.id === id ? record : x))
          : [...d.departments, record],
        users: d.users.map((u) =>
          selected.includes(u.id)
            ? { ...u, departmentId: record.id }
            : u.departmentId === id
              ? { ...u, departmentId: '' }
              : u,
        ),
      };
    }, 'Отдел сохранён.');
    if (ok) navigate('/app/departments');
  }
  return (
    <Screen>
      <PageHeading
        title={id ? 'Редактирование отдела' : 'Создание отдела'}
        back="/app/departments"
      />
      <form onSubmit={(e) => void submit(e)} className="form-layout">
        <Panel title="Сведения об отделе">
          <Field label="Название" required>
            <input
              name="name"
              minLength={2}
              maxLength={100}
              required
              defaultValue={department?.name}
            />
          </Field>
          <Field label="Описание">
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={department?.description}
            />
          </Field>
          <div className="form-actions">
            <ActionLink secondary to="/app/departments">
              Отмена
            </ActionLink>
            <Button type="submit" disabled={busy}>
              Сохранить отдел
            </Button>
          </div>
        </Panel>
        <Panel title="Участники">
          <p className="muted">Выбранные участники будут переведены в этот отдел.</p>
          <div className="checkbox-list">
            {data.users.map((u) => (
              <label key={u.id}>
                <input
                  type="checkbox"
                  name="members"
                  value={u.id}
                  defaultChecked={!!id && u.departmentId === id}
                />
                <Avatar name={u.name} />
                <span>{u.name}</span>
              </label>
            ))}
          </div>
        </Panel>
      </form>
    </Screen>
  );
}
