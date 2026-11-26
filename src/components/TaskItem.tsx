import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import type { TaskEntity } from "../domain/types";

interface TaskItemProps {
  readonly task: TaskEntity;
  readonly listTitle?: string;
  readonly onToggleComplete: (id: string) => void;
  readonly onDeleteTask: (id: string) => void;
  readonly onEditTask: (id: string, newTitle: string) => void;
}

export default function TaskItem({
  task,
  listTitle,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
}: TaskItemProps): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== task.title) {
      onEditTask(task.id, trimmedTitle);
    } else if (!trimmedTitle) {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSave();
    } else if (event.key === "Escape") {
      handleCancel();
    }
  };

  const handleEditClick = () => {
    if (task.isCompleted) {
      return;
    }
    setEditTitle(task.title);
    setIsEditing(true);
  };

  return (
    <li
      className={`task-item ${task.isCompleted ? "completed" : ""} ${isEditing ? "editing" : ""}`}
    >
      <input
        type="checkbox"
        checked={task.isCompleted}
        onChange={() => onToggleComplete(task.id)}
        className="task-checkbox"
        aria-label={`Mark task "${task.title}" as ${task.isCompleted ? "incomplete" : "complete"}`}
        disabled={isEditing}
      />

      {isEditing ? (
        <div className="edit-container">
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-input"
            aria-label={`Edit task text for "${task.title}"`}
          />
          <div className="edit-actions">
            <button
              type="button"
              onClick={handleSave}
              className="save-button"
              aria-label="Save task changes"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
              aria-label="Cancel task editing"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-content">
            <span
              className={`task-text ${task.isCompleted ? "no-edit" : ""}`}
              onDoubleClick={!task.isCompleted ? handleEditClick : undefined}
              title={task.isCompleted ? task.title : "Double-click to edit"}
            >
              {task.title}
            </span>
            {listTitle ? <span className="task-list-badge">{listTitle}</span> : null}
          </div>
          <div className="task-actions">
            <button
              type="button"
              onClick={handleEditClick}
              className="edit-task-button"
              aria-label={`Edit task "${task.title}"`}
              disabled={task.isCompleted}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              className="delete-task-button"
              aria-label={`Delete task "${task.title}"`}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}
