import { useState, type ReactElement } from "react";
import { formatDueDateLabel } from "../domain/calendarDate";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from "./Icons";

interface CompletedSectionProps {
  readonly completedTasks: readonly TaskEntity[];
  readonly lists: readonly TaskListEntity[];
  readonly onToggleComplete: (taskId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onClearCompleted: () => void;
}

export function CompletedSection({
  completedTasks,
  onToggleComplete,
  onDeleteTask,
  onClearCompleted,
}: CompletedSectionProps): ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  if (completedTasks.length === 0) {
    return null;
  }

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
          <span>Completed ({completedTasks.length})</span>
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
          {completedTasks.map((task) => (
            <li key={task.id} className="task-item completed">
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
                  {task.dueDate ? (
                    <span className="completed-due-label">{formatDueDateLabel(task.dueDate)}</span>
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
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
