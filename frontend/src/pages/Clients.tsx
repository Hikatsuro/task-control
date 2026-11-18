import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Building2, Plus, Search } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { availableProjects } from '../domain/model';
import { saveClient } from '../domain/commands';
import {
  ActionLink,
  Button,
  Empty,
  Field,
  NotFound,
  PageHeading,
  Panel,
  Screen,
} from '../components/ui';
import { ProjectCard } from './Projects';

export function Clients() {
  const { data, user } = useWorkspace();
  const [query, setQuery] = useState('');
  if (user?.role !== 'manager') return <NotFound forbidden />;
  const clients = data.clients.filter((c) =>
    `${c.name} ${c.contact} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <PageHeading
        title="Заказчики"
        description="Контакты и проекты в одном справочнике."
        action={
          <ActionLink to="/app/clients/new">
            <Plus size={18} />
            Добавить заказчика
          </ActionLink>
        }
      />
      <label className="search-field standalone-search">
        <Search size={17} />
        <input
          aria-label="Поиск заказчика"
          placeholder="Название, контакт или почта"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {clients.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Организация</th>
                <th>Контактное лицо</th>
                <th>Электронная почта</th>
                <th>Проекты</th>
                <th>
                  <span className="sr-only">Открыть</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/app/clients/${c.id}`} className="person-inline">
                      <span className="client-icon">
                        <Building2 size={19} />
                      </span>
                      <strong>{c.name}</strong>
                    </Link>
                  </td>
                  <td>{c.contact || 'Не указано'}</td>
                  <td>{c.email || 'Не указана'}</td>
                  <td>{availableProjects(data, user).filter((p) => p.clientId === c.id).length}</td>
                  <td>
                    <Link
                      className="icon-button"
                      to={`/app/clients/${c.id}`}
                      aria-label={`Открыть ${c.name}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Заказчики не найдены"
          description="Измените поиск или добавьте новую организацию."
        />
      )}
    </Screen>
  );
}
export function ClientForm() {
  const { id } = useParams();
  const { data, user, transact, busy } = useWorkspace();
  const navigate = useNavigate();
  const client = data.clients.find((c) => c.id === id);
  if (user?.role !== 'manager') return <NotFound forbidden />;
  if (id && !client) return <NotFound />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await transact(
      (d, a) =>
        saveClient(
          d,
          a,
          {
            name: String(f.get('name')),
            contact: String(f.get('contact')),
            email: String(f.get('email')),
            phone: String(f.get('phone')),
            notes: String(f.get('notes')),
          },
          id,
        ),
      'Заказчик сохранён.',
    );
    if (ok) navigate(id ? `/app/clients/${id}` : '/app/clients');
  }
  return (
    <Screen>
      <PageHeading
        title={id ? 'Редактирование заказчика' : 'Новый заказчик'}
        description="Сохраните контакты для связи по проекту."
        back="/app/clients"
      />
      <form onSubmit={(e) => void submit(e)} className="form-single">
        <Panel title="Сведения о заказчике">
          <Field label="Название организации или Ф. И. О." required>
            <input name="name" minLength={2} maxLength={160} required defaultValue={client?.name} />
          </Field>
          <div className="form-grid">
            <Field label="Контактное лицо">
              <input name="contact" maxLength={120} defaultValue={client?.contact} />
            </Field>
            <Field label="Электронная почта">
              <input name="email" type="email" defaultValue={client?.email} />
            </Field>
            <Field label="Телефон">
              <input name="phone" type="tel" maxLength={40} defaultValue={client?.phone} />
            </Field>
          </div>
          <Field label="Примечания">
            <textarea name="notes" rows={4} maxLength={5000} defaultValue={client?.notes} />
          </Field>
          <div className="form-actions">
            <ActionLink secondary to="/app/clients">
              Отмена
            </ActionLink>
            <Button type="submit" disabled={busy}>
              Сохранить заказчика
            </Button>
          </div>
        </Panel>
      </form>
    </Screen>
  );
}
export function ClientDetail() {
  const { id } = useParams();
  const { data, user } = useWorkspace();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  const client = data.clients.find((c) => c.id === id);
  if (!client) return <NotFound />;
  const projects = availableProjects(data, user).filter((p) => p.clientId === id);
  return (
    <Screen>
      <PageHeading
        title={client.name}
        description="Карточка заказчика и связанные проекты."
        back="/app/clients"
        action={
          <ActionLink secondary to={`/app/clients/${id}/edit`}>
            Редактировать
          </ActionLink>
        }
      />
      <Panel title="Контактные данные">
        <dl className="details details-columns">
          <div>
            <dt>Контактное лицо</dt>
            <dd>{client.contact || 'Не указано'}</dd>
          </div>
          <div>
            <dt>Почта</dt>
            <dd>{client.email || 'Не указана'}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{client.phone || 'Не указан'}</dd>
          </div>
          <div>
            <dt>Примечания</dt>
            <dd className="preserve-lines">{client.notes || 'Нет примечаний'}</dd>
          </div>
        </dl>
      </Panel>
      <div className="section-heading">
        <h2>Проекты заказчика</h2>
        <ActionLink secondary to="/app/projects/new">
          <Plus size={17} />
          Создать проект
        </ActionLink>
      </div>
      {projects.length ? (
        <div className="projects-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Связанных проектов пока нет"
          description="При создании проекта выберите этого заказчика."
        />
      )}
    </Screen>
  );
}
