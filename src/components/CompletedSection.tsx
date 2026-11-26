import { useState, type ReactElement } from "react";
import { formatDueDateLabel } from "../domain/calendarDate";
import type { CompletedTaskGroup } from "../domain/selectors";
import type { TaskEntity } from "../domain/types";
import { ChevronDownIcon, ChevronRightIcon, SubtaskIcon, TrashIcon } from "./Icons";

interface CompletedSectionProps {
  readonly completedItems: readonly CompletedTaskGroup[];
  readonly completedCount: number;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onClearCompleted: () => void;
}

export function CompletedSection({
  completedItems,
  completedCount,
  onToggleComplete,
  onDeleteTask,
  onClearCompleted,
}: CompletedSectionProps): ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  if (completedCount === 0) {
    return null;
  }

  const renderCompletedRow = (
    task: TaskEntity,
    activeParentTitle: string | null,
    isSubtask: boolean,
  ): ReactElement => (
    <div className="task-row">
      <input
        type="checkbox"
        checked={task.isCompleted}
        onChange={() => onToggleComplete(task.id)}
        className="task-checkbox"
        aria-label={`Mark task "${task.title}" as incomplete`}
      />

      <div className="task-main">
        <span className="task-text no-edit">{task.title}</span>
        {task.notes.trim().length > 0 ? <p className="task-notes-preview">{task.notes}</p> : null}
        {task.dueDate || activeParentTitle || isSubtask ? (
          <div className="completed-meta-row">
            {task.dueDate ? (
              <span className="completed-due-label">{formatDueDateLabel(task.dueDate)}</span>
            ) : null}
            {activeParentTitle ? (
              <span className="completed-parent-badge">
                <SubtaskIcon size={12} />
                <span>Subtask of &ldquo;{activeParentTitle}&rdquo;</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="task-actions">
        <button
          type="button"
          onClick={() => onDeleteTask(task.id)}
          className="icon-button icon-button-sm delete-icon-button"
          aria-label={`Delete task "${task.title}"`}
          title="Delete task"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );

  return (
    <section className="completed-section" aria-label="Completed tasks">
      <div className="completed-section-header">
        <button
          type="button"
          className="completed-toggle-button"
          aria-expanded={isOpen}
          aria-controls="completed-tasks-list"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <span>Completed ({completedCount})</span>
        </button>

        <button
          type="button"
          className="btn-text clear-completed-button"
          onClick={onClearCompleted}
          aria-label="Delete all completed tasks"
        >
          Delete all completed
        </button>
      </div>

      {isOpen ? (
        <ul id="completed-tasks-list" className="task-list completed-task-list">
          {completedItems.map((item) => (
            <li key={item.task.id} className="completed-tree-group">
              <div
                className={`task-item completed ${item.activeParentTitle ? "subtask-item" : ""}`}
              >
                {renderCompletedRow(item.task, item.activeParentTitle, false)}
              </div>

              {item.subtasks.length > 0 ? (
                <ul
                  className="subtask-list completed-subtask-list"
                  aria-label={`Completed subtasks for "${item.task.title}"`}
                >
                  {item.subtasks.map((subtask) => (
                    <li key={subtask.id} className="task-item subtask-item completed">
                      {renderCompletedRow(subtask, null, true)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
