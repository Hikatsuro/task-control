import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace-context';
import {
  availableProjects,
  availableTasks,
  formatDate,
  isOverdue,
  offsetDate,
  projectProgress,
  statusLabels,
  statuses,
} from '../domain/model';
import {
  Button,
  Empty,
  Field,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  Screen,
  Stat,
  StatusBadge,
} from '../components/ui';
import { DeadlineChart, Legend, MiniProgress, PeopleChart } from './reportCharts';
import { onTimeShare } from './reportData';

export function Reports() {
  const { data, user, notify } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  if (user?.role !== 'manager') return <NotFound forbidden />;
  const from = params.get('from') ?? offsetDate(-14);
  const until = params.get('until') ?? offsetDate(30);
  const projectId = params.get('project') ?? '';
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };
  const projects = availableProjects(data, user);
  const tasks = availableTasks(data, user).filter(
    (t) =>
      (!projectId || t.projectId === projectId) &&
      !!t.dueDate &&
      t.dueDate >= from &&
      t.dueDate <= until,
  );
  const total = tasks.length;
  const onTime = onTimeShare(tasks);
  async function exportExcel() {
    setExporting(true);
    try {
      const { default: writeExcelFile } = await import('write-excel-file/universal');
      const headers = [
        'Задача',
        'Проект',
        'Исполнитель',
        'Статус',
        'Плановый срок',
        'Фактически выполнена',
        'Просрочена сейчас',
      ].map((value) => ({ value, fontWeight: 'bold' as const }));
      const rows = tasks.map((task) => [
        task.title,
        data.projects.find((p) => p.id === task.projectId)?.name ?? '',
        data.users.find((u) => u.id === task.assigneeId)?.name ?? '',
        statusLabels[task.status],
        task.dueDate,
        task.completedAt?.slice(0, 10) ?? '',
        isOverdue(task) ? 'Да' : 'Нет',
      ]);
      const blob = await writeExcelFile([headers, ...rows], {
        sheet: 'Задачи',
        columns: [45, 30, 28, 20, 18, 24, 20].map((width) => ({ width })),
      }).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TaskControl-${from}-${until}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Отчёт Excel подготовлен.');
    } catch (cause) {
      console.error('Не удалось сформировать отчёт Excel', cause);
      notify('Не удалось создать файл отчёта.', 'error');
    } finally {
      setExporting(false);
    }
  }
  return (
    <Screen>
      <PageHeading
        title="Отчёты"
        action={
          <div className="report-actions">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={17} />
              Печать / PDF
            </Button>
            <Button onClick={() => void exportExcel()} disabled={exporting || from > until}>
              <Download size={17} />
              {exporting ? 'Готовим файл…' : 'Скачать Excel'}
            </Button>
          </div>
        }
      />
      <div className="report-filters">
        <Field label="Срок выполнения от">
          <input type="date" value={from} onChange={(e) => change('from', e.target.value)} />
        </Field>
        <Field label="Срок выполнения до">
          <input type="date" value={until} onChange={(e) => change('until', e.target.value)} />
        </Field>
        <Field label="Проект">
          <select value={projectId} onChange={(e) => change('project', e.target.value)}>
            <option value="">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {from > until && (
        <Notice tone="warning">Дата начала периода должна быть не позже даты окончания.</Notice>
      )}
      <p className="report-print-heading">
        Отчёт TaskControl · {formatDate(from)} — {formatDate(until)} · По плановым срокам задач
      </p>
      <div className="stats-row">
        <Stat value={total} label="задач за период" countUp />
        <Stat value={tasks.filter((t) => t.status === 'done').length} label="выполнено" countUp />
        <Stat
          value={tasks.filter((t) => isOverdue(t)).length}
          label="просрочено сейчас"
          accent
          countUp
        />
        <Stat value={onTime === null ? '—' : `${onTime}%`} label="принято в срок" countUp />
      </div>
      <Panel title="Сроки по неделям" action={<Legend />}>
        <p className="rep-note">
          Задачи по плановому сроку и их состояние на сегодня. Наведите на столбец, чтобы увидеть
          числа.
        </p>
        <DeadlineChart tasks={tasks} from={from} until={until} />
      </Panel>
      <div className="two-columns">
        <Panel title="Распределение по статусам">
          <div
            className="status-chart"
            role="img"
            aria-label={statuses
              .map((s) => `${statusLabels[s]}: ${tasks.filter((t) => t.status === s).length}`)
              .join(', ')}
          >
            {statuses.map((s) => {
              const count = tasks.filter((t) => t.status === s).length;
              return (
                <div key={s}>
                  <span>{statusLabels[s]}</span>
                  <div className="chart-track">
                    <span
                      className={`chart-bar chart-${s}`}
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Задачи по сотрудникам" action={<Legend />}>
          <PeopleChart tasks={tasks} users={data.users} />
        </Panel>
      </div>
      <Panel title="Прогресс проектов">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Проект</th>
                <th>Задач за период</th>
                <th>Выполнено</th>
                <th>Прогресс за период</th>
              </tr>
            </thead>
            <tbody>
              {projects
                .filter((p) => !projectId || p.id === projectId)
                .map((p) => {
                  const items = tasks.filter((t) => t.projectId === p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/app/projects/${p.id}`}>{p.name}</Link>
                      </td>
                      <td>{items.length}</td>
                      <td>{items.filter((t) => t.status === 'done').length}</td>
                      <td>
                        <MiniProgress value={projectProgress(items)} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Детализация отчёта">
        {tasks.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Задача</th>
                  <th>Статус</th>
                  <th>Плановый срок</th>
                  <th>Фактическое завершение</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/app/tasks/${t.id}`}>{t.title}</Link>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>{formatDate(t.dueDate)}</td>
                    <td>{t.completedAt ? formatDate(t.completedAt) : 'Не принята'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Нет задач за этот период"
            description="Измените даты или выберите другой проект."
          />
        )}
      </Panel>
      <Notice>
        Период определяется по плановому сроку задачи. Просрочка считается на сегодня. Отчёт
        отражает текущие состояния; автоматическая оценка эффективности сотрудников не применяется.
        PDF сохраняется через диалог печати браузера.
      </Notice>
    </Screen>
  );
}
