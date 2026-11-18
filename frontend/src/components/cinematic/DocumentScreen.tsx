import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
} from 'lucide-react';

export function DocumentScreen({ chapter, onAdvance }: { chapter: number; onAdvance: () => void }) {
  const [tab, setTab] = useState('document');
  const [comment, setComment] = useState(false);
  const accepted = chapter >= 4;
  return (
    <div className="cine-product" data-accepted={accepted}>
      <div className="cine-product-top">
        <strong>
          TASK<span>CONTROL</span>
        </strong>
        <span>
          Проект команды <ChevronRight size={12} /> TC–024
        </span>
        <span className="cine-user">{chapter === 2 ? 'rr' : 'Hi'}</span>
      </div>
      <div className="cine-product-body">
        <aside className="cine-product-sidebar">
          <span className="cine-project-mark">П</span>
          <strong>
            Корпоративный
            <br />
            портал
          </strong>
          <span>Обзор проекта</span>
          <span className="is-selected">Задачи</span>
          <span>Документы</span>
          <span>Обсуждение</span>
          <div className="cine-sidebar-progress">
            <small>Прогресс проекта</small>
            <div>
              <i style={{ transform: `scaleX(${accepted ? 1 : 0.75})` }} />
            </div>
            <strong>{accepted ? '100%' : '75%'}</strong>
          </div>
        </aside>
        <div className="cine-product-content">
          <div className="cine-task-heading">
            <span>Задача TC–024</span>
            <span className={`cine-task-status ${accepted ? 'is-accepted' : ''}`}>
              {accepted ? <Check size={12} /> : null}
              {accepted
                ? 'Выполнена'
                : chapter === 3
                  ? 'На проверке'
                  : chapter === 2
                    ? 'В работе'
                    : 'Новая'}
            </span>
          </div>
          <h3>Подготовить концепцию портала</h3>
          <div className="cine-task-meta">
            <span>
              Исполнитель <strong>rr0semary</strong>
            </span>
            <span>
              Руководитель <strong>Hikatsuro</strong>
            </span>
          </div>
          <div className="cine-document-tabs" role="tablist" aria-label="Материалы задачи">
            {[
              ['document', 'Документ'],
              ['discussion', 'Обсуждение'],
              ['history', 'История'],
            ].map(([id, title]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {title}
              </button>
            ))}
          </div>
          <div
            className="cine-document-panel"
            role="tabpanel"
            aria-label={
              tab === 'document' ? 'Документ' : tab === 'history' ? 'История' : 'Обсуждение'
            }
          >
            {tab === 'document' ? (
              <>
                <div className="cine-file-strip">
                  <FileText size={16} />
                  <span>
                    Концепция портала.pdf
                    <small>Версия {chapter >= 3 ? '2' : '1'} · демонстрационный документ</small>
                  </span>
                  <Paperclip size={14} />
                </div>
                <article className="cine-paper">
                  <div className="cine-paper-head">
                    <span>ПРОЕКТ / КОРПОРАТИВНЫЙ ПОРТАЛ</span>
                    <span>01</span>
                  </div>
                  <h4>
                    Концепция
                    <br />
                    рабочего пространства.
                  </h4>
                  <p>Единая среда для планирования, обсуждения и приёмки задач команды.</p>
                  <div className="cine-paper-rule" />
                  <h5>01. Назначение системы</h5>
                  <p>
                    Сотрудник видит поручения и передаёт результат. Руководитель контролирует сроки
                    и подтверждает выполнение.
                  </p>
                  <h5>02. Роли и ответственность</h5>
                  <div className={`cine-paper-highlight ${chapter === 3 ? 'is-review' : ''}`}>
                    <p>
                      Администратор управляет доступом. Руководитель назначает задачи. Сотрудник
                      выполняет работу.
                    </p>
                    {chapter === 3 ? <MessageSquare size={14} /> : <Check size={14} />}
                  </div>
                  <h5>03. Критерии приёмки</h5>
                  <ul>
                    <li>
                      <Check size={12} />
                      Роли и права описаны
                    </li>
                    <li>
                      <Check size={12} />
                      Этапы задачи согласованы
                    </li>
                    <li>
                      <Check size={12} />
                      Замечания учтены в документе
                    </li>
                  </ul>
                  {accepted && (
                    <div className="cine-stamp">
                      <CheckCheck size={20} />
                      <strong>СОГЛАСОВАНО</strong>
                      <span>Принято руководителем</span>
                    </div>
                  )}
                </article>
              </>
            ) : tab === 'discussion' ? (
              <div className="cine-discussion">
                <MessageSquare size={26} />
                <h4>Контекст остаётся в задаче</h4>
                <p>
                  <strong>Hikatsuro</strong>
                  <br />
                  Уточнить права руководителя при приёмке результата.
                </p>
                <p>
                  <strong>rr0semary</strong>
                  <br />
                  Добавила описание ролей и обновила документ до версии 2.
                </p>
                {comment && (
                  <p>
                    <strong>Hikatsuro</strong>
                    <br />
                    Все замечания учтены. Можно принимать работу.
                  </p>
                )}
              </div>
            ) : (
              <div className="cine-history">
                {[
                  'Задача назначена сотруднику',
                  'Документ добавлен в задачу',
                  'Результат отправлен на проверку',
                  ...(accepted ? ['Документ принят руководителем'] : []),
                ].map((text, i) => (
                  <p key={text}>
                    <span>{i + 1}</span>
                    {text}
                    <Check size={14} />
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="cine-product-actions">
            <span>
              {accepted
                ? 'Решение сохранено в истории'
                : chapter === 3
                  ? 'Проверка результата'
                  : 'Документ связан с задачей'}
            </span>
            {chapter === 3 && (
              <button
                className="cine-comment-button"
                onClick={() => {
                  setComment(true);
                  setTab('discussion');
                }}
              >
                <MessageSquare size={14} />
                Замечание
              </button>
            )}
            <button className="cine-product-primary" onClick={onAdvance}>
              {accepted
                ? 'Передать заказчику'
                : chapter === 3
                  ? 'Принять документ'
                  : chapter === 2
                    ? 'На проверку'
                    : 'Назначить'}
              {chapter === 2 ? <Send size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
