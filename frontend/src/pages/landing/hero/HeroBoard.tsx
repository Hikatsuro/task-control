import type { CSSProperties } from 'react';
import { columns, tasks } from '../demoTasks';

/** The project board the hero's task cards land on: a header and four status columns. */
export function HeroBoard() {
  return (
    <div className="rb-board-inner">
      <div className="rb-board-bar">
        <div>
          <span>Проекты / Корпоративный портал</span>
          <b>Задачи в работе</b>
        </div>
        <span className="rb-members">
          <i>H</i>
          <i>M</i>
          <i>R</i>
        </span>
      </div>
      {columns.map((column, i) => (
        <div className="rb-column" key={column} style={{ '--column': i } as CSSProperties}>
          <span className="rb-column-title" data-status={i}>
            <i />
            {column}
            <small>{tasks.filter((task) => task.status === i).length}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
