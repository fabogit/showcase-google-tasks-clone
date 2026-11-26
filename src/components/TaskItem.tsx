import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import {
  addCalendarDays,
  classifyDueDate,
  formatDueDateLabel,
  isCalendarDate,
  todayCalendarDate,
  type CalendarDate,
} from "../domain/calendarDate";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import { CalendarIcon, EditIcon, FolderMoveIcon, NotesIcon, StarIcon, TrashIcon } from "./Icons";

export interface TaskUpdatePatch {
  readonly title?: string;
  readonly notes?: string;
  readonly dueDate?: CalendarDate | null;
}

interface TaskItemProps {
  readonly task: TaskEntity;
  readonly lists: readonly TaskListEntity[];
  readonly listTitle?: string;
  readonly isExpanded: boolean;
  readonly onToggleExpand: (taskId: string) => void;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onToggleStarred: (taskId: string) => void;
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
}

interface TaskDetailsEditorProps {
  readonly task: TaskEntity;
  readonly lists: readonly TaskListEntity[];
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onClose: () => void;
}

function TaskDetailsEditor({
  task,
  lists,
  onUpdateTask,
  onMoveTaskToList,
  onClose,
}: TaskDetailsEditorProps): ReactElement {
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [notesDraft, setNotesDraft] = useState(task.notes);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const today = todayCalendarDate();
  const tomorrow = addCalendarDays(today, 1);

  const commitDraft = () => {
    const trimmedTitle = titleDraft.trim();
    const patch: {
      title?: string;
      notes?: string;
    } = {};

    if (trimmedTitle && trimmedTitle !== task.title) {
      patch.title = trimmedTitle;
    }
    if (notesDraft !== task.notes) {
      patch.notes = notesDraft;
    }

    if (patch.title !== undefined || patch.notes !== undefined) {
      onUpdateTask(task.id, patch);
    }
    onClose();
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const handleNotesKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="task-details-editor">
      <input
        ref={titleInputRef}
        type="text"
        className="details-title-input"
        value={titleDraft}
        onChange={(event) => setTitleDraft(event.target.value)}
        onKeyDown={handleTitleKeyDown}
        aria-label={`Edit title for "${task.title}"`}
      />

      <div className="details-field">
        <NotesIcon className="details-field-icon" />
        <textarea
          className="details-notes-input"
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          onKeyDown={handleNotesKeyDown}
          placeholder="Add details"
          rows={2}
          aria-label="Task notes"
        />
      </div>

      <div className="details-meta-row">
        <div className="details-due-controls">
          <CalendarIcon className="details-field-icon" />
          <button
            type="button"
            className={`due-preset-button ${task.dueDate === today ? "active" : ""}`}
            onClick={() => onUpdateTask(task.id, { dueDate: today })}
          >
            Today
          </button>
          <button
            type="button"
            className={`due-preset-button ${task.dueDate === tomorrow ? "active" : ""}`}
            onClick={() => onUpdateTask(task.id, { dueDate: tomorrow })}
          >
            Tomorrow
          </button>
          <input
            type="date"
            className="details-date-input"
            value={task.dueDate ?? ""}
            aria-label="Due date"
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                onUpdateTask(task.id, { dueDate: null });
              } else if (isCalendarDate(value)) {
                onUpdateTask(task.id, { dueDate: value });
              }
            }}
          />
          {task.dueDate !== null ? (
            <button
              type="button"
              className="due-preset-button"
              onClick={() => onUpdateTask(task.id, { dueDate: null })}
            >
              Clear
            </button>
          ) : null}
        </div>

        {lists.length > 1 ? (
          <div className="details-move-control">
            <FolderMoveIcon className="details-field-icon" />
            <select
              className="details-move-select"
              aria-label="Move to list"
              value={task.listId}
              onChange={(event) => onMoveTaskToList(task.id, event.target.value)}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="details-actions">
        <button type="button" className="cancel-button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="save-button" onClick={commitDraft}>
          Save
        </button>
      </div>
    </div>
  );
}

export default function TaskItem({
  task,
  lists,
  listTitle,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onToggleStarred,
  onUpdateTask,
  onMoveTaskToList,
  onDeleteTask,
}: TaskItemProps): ReactElement {
  const showEditor = isExpanded && !task.isCompleted;
  const dueStatus = task.dueDate ? classifyDueDate(task.dueDate) : null;
  const dueLabel = task.dueDate ? formatDueDateLabel(task.dueDate) : null;
  const hasNotesPreview = !showEditor && task.notes.trim().length > 0;

  return (
    <li
      className={`task-item ${task.isCompleted ? "completed" : ""} ${showEditor ? "editing" : ""}`}
    >
      <div className="task-row">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={() => onToggleComplete(task.id)}
          className="task-checkbox"
          aria-label={`Mark task "${task.title}" as ${
            task.isCompleted ? "incomplete" : "complete"
          }`}
        />

        <div className="task-main">
          <span
            className={`task-text ${task.isCompleted ? "no-edit" : ""}`}
            onDoubleClick={!task.isCompleted ? () => onToggleExpand(task.id) : undefined}
            title={task.isCompleted ? task.title : "Double-click to edit details"}
          >
            {task.title}
          </span>

          {hasNotesPreview ? <p className="task-notes-preview">{task.notes}</p> : null}

          {dueLabel || listTitle ? (
            <div className="task-chips">
              {dueLabel && dueStatus ? (
                <span className={`due-chip due-chip--${dueStatus}`}>
                  <CalendarIcon size={12} />
                  <span>{dueLabel}</span>
                </span>
              ) : null}
              {listTitle ? <span className="task-list-badge">{listTitle}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="task-actions">
          {!task.isCompleted ? (
            <>
              <button
                type="button"
                onClick={() => onToggleExpand(task.id)}
                className="icon-button icon-button-sm"
                aria-label={`Edit task "${task.title}"`}
                aria-expanded={showEditor}
                title="Edit details"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => onToggleStarred(task.id)}
                className={`icon-button icon-button-sm star-button ${
                  task.isStarred ? "starred" : ""
                }`}
                aria-label={
                  task.isStarred ? `Remove star from "${task.title}"` : `Star task "${task.title}"`
                }
                aria-pressed={task.isStarred}
                title={task.isStarred ? "Remove star" : "Add to Starred"}
              >
                <StarIcon size={16} filled={task.isStarred} />
              </button>
            </>
          ) : null}

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

      {showEditor ? (
        <TaskDetailsEditor
          key={task.id}
          task={task}
          lists={lists}
          onUpdateTask={onUpdateTask}
          onMoveTaskToList={onMoveTaskToList}
          onClose={() => onToggleExpand(task.id)}
        />
      ) : null}
    </li>
  );
}
