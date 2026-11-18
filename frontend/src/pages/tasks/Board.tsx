import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ArrowRight,
  CalendarDays,
  GripVertical,
  MessageSquare,
  Paperclip,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActionLink, Avatar, PageHeading, PriorityBadge, Screen } from '../../components/ui';
import type { Status, Task } from '../../domain/model';
import { formatDate, isOverdue, statuses, statusLabels, transition } from '../../domain/model';
import { useWorkspace } from '../../state/workspace-context';
import { TaskFilters } from './TaskFilters';
import { useFilteredTasks } from './useFilteredTasks';

function BoardCard({ task }: { task: Task }) {
  const { data } = useWorkspace();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <article
      ref={setNodeRef}
      className={`board-card ${isDragging ? 'board-card-dragging' : ''}`}
      style={
        transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined
      }
    >
      <div className="board-card-top">
        <PriorityBadge priority={task.priority} />
        <button
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Переместить задачу «${task.title}»`}
        >
          <GripVertical size={18} />
        </button>
      </div>
      <Link to={`/app/tasks/${task.id}`} className="task-title-link">
        {task.title}
      </Link>
      <p>{data.projects.find((p) => p.id === task.projectId)?.name}</p>
      <div className="board-card-bottom">
        <span className={isOverdue(task) ? 'overdue' : ''}>
          <CalendarDays size={14} />
          {formatDate(task.dueDate)}
        </span>
        <Avatar name={data.users.find((u) => u.id === task.assigneeId)?.name ?? '?'} size="small" />
      </div>
      <div className="board-card-meta">
        <span>
          <MessageSquare size={13} />
          {task.comments.length}
        </span>
        <span>
          <Paperclip size={13} />
          {task.attachments.length}
        </span>
        <Link to={`/app/tasks/${task.id}`}>
          Изменить статус <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}

function BoardLane({ status, tasks }: { status: Status; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`board-lane ${isOver ? 'board-lane-over' : ''}`}>
      <header>
        <span className={`status-dot dot-${status}`} />
        <h2>{statusLabels[status]}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="board-lane-body">
        {tasks.map((t) => (
          <BoardCard key={t.id} task={t} />
        ))}
        {!tasks.length && <p className="board-empty">Перетащите задачу сюда</p>}
      </div>
    </section>
  );
}

export function Board() {
  const { tasks, user, data } = useFilteredTasks();
  const { transact } = useWorkspace();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  if (!user) return null;
  return (
    <Screen>
      <PageHeading
        title="Задачи в работе"
        description="Одна доска — весь путь от поручения до принятого результата."
        action={
          user.role === 'manager' && (
            <ActionLink to="/app/tasks/new">
              <Plus size={18} />
              Создать задачу
            </ActionLink>
          )
        }
      />
      <TaskFilters view="board" />
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(e) => {
          setActiveId(null);
          const task = tasks.find((t) => t.id === e.active.id);
          const status = e.over?.id as Status | undefined;
          if (!task || !status || task.status === status || !statuses.includes(status)) return;
          if (task.status === 'in_review' && status === 'in_progress') {
            navigate(`/app/tasks/${task.id}?return=1`);
            return;
          }
          void transact((d, a) => transition(d, a, task.id, status), 'Задача перемещена.');
        }}
      >
        <div className="kanban-board">
          {statuses.map((s) => (
            <BoardLane key={s} status={s} tasks={tasks.filter((t) => t.status === s)} />
          ))}
        </div>
        <DragOverlay>
          {activeId && (
            <div className="drag-overlay">{data.tasks.find((t) => t.id === activeId)?.title}</div>
          )}
        </DragOverlay>
      </DndContext>
      <p className="muted board-hint">
        Перемещайте карточки за маркер. С клавиатуры или телефона статус также можно изменить в
        карточке задачи. Приёмка доступна руководителю.
      </p>
    </Screen>
  );
}
