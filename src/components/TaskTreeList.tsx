import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import type { TaskTreeItem } from "../domain/selectors";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import { GripVerticalIcon } from "./Icons";
import TaskItem, { type TaskUpdatePatch } from "./TaskItem";

interface TaskTreeListProps {
  readonly items: readonly TaskTreeItem[];
  readonly lists: readonly TaskListEntity[];
  readonly expandedTaskId: string | null;
  readonly onToggleExpand: (taskId: string) => void;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onToggleStarred: (taskId: string) => void;
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onAddSubtask: (parentId: string, title: string) => void;
  readonly onIndentTask: (taskId: string, targetParentId: string) => void;
  readonly onOutdentTask: (taskId: string) => void;
  readonly onReorderTasks: (parentId: string | null, orderedTaskIds: readonly string[]) => void;
}

interface AddSubtaskFormProps {
  readonly parentTitle: string;
  readonly onSubmit: (title: string) => void;
  readonly onCancel: () => void;
}

function AddSubtaskForm({ parentTitle, onSubmit, onCancel }: AddSubtaskFormProps): ReactElement {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setTitle("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="inline-subtask-form"
      aria-label={`Add subtask to "${parentTitle}"`}
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add subtask..."
        className="inline-subtask-input"
        aria-label="New subtask text"
      />
      <button type="button" className="cancel-button" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="save-button">
        Add
      </button>
    </form>
  );
}

interface SortableSubtaskItemProps {
  readonly subtask: TaskEntity;
  readonly lists: readonly TaskListEntity[];
  readonly expandedTaskId: string | null;
  readonly onToggleExpand: (taskId: string) => void;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onToggleStarred: (taskId: string) => void;
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onOutdentTask: (taskId: string) => void;
}

function SortableSubtaskItem({
  subtask,
  lists,
  expandedTaskId,
  onToggleExpand,
  onToggleComplete,
  onToggleStarred,
  onUpdateTask,
  onMoveTaskToList,
  onDeleteTask,
  onOutdentTask,
}: SortableSubtaskItemProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`sortable-subtask-row ${isDragging ? "dragging" : ""}`}
    >
      <TaskItem
        as="div"
        isSubtask
        task={subtask}
        lists={lists}
        isExpanded={expandedTaskId === subtask.id}
        canOutdent={!subtask.isCompleted}
        onOutdent={() => onOutdentTask(subtask.id)}
        dragHandle={
          <button
            type="button"
            className="icon-button icon-button-sm drag-handle"
            aria-label={`Reorder subtask "${subtask.title}"`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon />
          </button>
        }
        onToggleExpand={onToggleExpand}
        onToggleComplete={onToggleComplete}
        onToggleStarred={onToggleStarred}
        onUpdateTask={onUpdateTask}
        onMoveTaskToList={onMoveTaskToList}
        onDeleteTask={onDeleteTask}
      />
    </li>
  );
}

interface SortableRootGroupProps {
  readonly item: TaskTreeItem;
  readonly previousRootId: string | null;
  readonly lists: readonly TaskListEntity[];
  readonly expandedTaskId: string | null;
  readonly isAddingSubtask: boolean;
  readonly onStartAddSubtask: (taskId: string) => void;
  readonly onCancelAddSubtask: () => void;
  readonly onToggleExpand: (taskId: string) => void;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onToggleStarred: (taskId: string) => void;
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onAddSubtask: (parentId: string, title: string) => void;
  readonly onIndentTask: (taskId: string, targetParentId: string) => void;
  readonly onOutdentTask: (taskId: string) => void;
  readonly onReorderTasks: (parentId: string | null, orderedTaskIds: readonly string[]) => void;
}

function SortableRootGroup({
  item,
  previousRootId,
  lists,
  expandedTaskId,
  isAddingSubtask,
  onStartAddSubtask,
  onCancelAddSubtask,
  onToggleExpand,
  onToggleComplete,
  onToggleStarred,
  onUpdateTask,
  onMoveTaskToList,
  onDeleteTask,
  onAddSubtask,
  onIndentTask,
  onOutdentTask,
  onReorderTasks,
}: SortableRootGroupProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.task.id,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const subtaskIds = useMemo(() => item.subtasks.map((subtask) => subtask.id), [item.subtasks]);

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subtaskIds.indexOf(String(active.id));
    const newIndex = subtaskIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorderTasks(item.task.id, arrayMove(subtaskIds, oldIndex, newIndex));
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const canIndent = !item.task.isCompleted && previousRootId !== null && item.subtasks.length === 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-tree-group ${isDragging ? "dragging" : ""}`}
    >
      <TaskItem
        as="div"
        task={item.task}
        lists={lists}
        isExpanded={expandedTaskId === item.task.id}
        canAddSubtask={!item.task.isCompleted}
        onStartAddSubtask={onStartAddSubtask}
        canIndent={canIndent}
        onIndent={previousRootId ? () => onIndentTask(item.task.id, previousRootId) : undefined}
        dragHandle={
          <button
            type="button"
            className="icon-button icon-button-sm drag-handle"
            aria-label={`Reorder task "${item.task.title}"`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon />
          </button>
        }
        onToggleExpand={onToggleExpand}
        onToggleComplete={onToggleComplete}
        onToggleStarred={onToggleStarred}
        onUpdateTask={onUpdateTask}
        onMoveTaskToList={onMoveTaskToList}
        onDeleteTask={onDeleteTask}
      />

      {isAddingSubtask ? (
        <AddSubtaskForm
          parentTitle={item.task.title}
          onSubmit={(title) => {
            onAddSubtask(item.task.id, title);
            onCancelAddSubtask();
          }}
          onCancel={onCancelAddSubtask}
        />
      ) : null}

      {item.subtasks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSubtaskDragEnd}
        >
          <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
            <ul className="subtask-list" aria-label={`Subtasks for "${item.task.title}"`}>
              {item.subtasks.map((subtask) => (
                <SortableSubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  lists={lists}
                  expandedTaskId={expandedTaskId}
                  onToggleExpand={onToggleExpand}
                  onToggleComplete={onToggleComplete}
                  onToggleStarred={onToggleStarred}
                  onUpdateTask={onUpdateTask}
                  onMoveTaskToList={onMoveTaskToList}
                  onDeleteTask={onDeleteTask}
                  onOutdentTask={onOutdentTask}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
    </li>
  );
}

export function TaskTreeList({
  items,
  lists,
  expandedTaskId,
  onToggleExpand,
  onToggleComplete,
  onToggleStarred,
  onUpdateTask,
  onMoveTaskToList,
  onDeleteTask,
  onAddSubtask,
  onIndentTask,
  onOutdentTask,
  onReorderTasks,
}: TaskTreeListProps): ReactElement {
  const [addingSubtaskParentId, setAddingSubtaskParentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const rootIds = useMemo(() => items.map((item) => item.task.id), [items]);

  const handleRootDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = rootIds.indexOf(String(active.id));
    const newIndex = rootIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorderTasks(null, arrayMove(rootIds, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
      <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
        <ul className="task-list task-tree-list">
          {items.map((item, index) => (
            <SortableRootGroup
              key={item.task.id}
              item={item}
              previousRootId={index > 0 ? items[index - 1].task.id : null}
              lists={lists}
              expandedTaskId={expandedTaskId}
              isAddingSubtask={addingSubtaskParentId === item.task.id}
              onStartAddSubtask={(taskId) =>
                setAddingSubtaskParentId((prev) => (prev === taskId ? null : taskId))
              }
              onCancelAddSubtask={() => setAddingSubtaskParentId(null)}
              onToggleExpand={onToggleExpand}
              onToggleComplete={onToggleComplete}
              onToggleStarred={onToggleStarred}
              onUpdateTask={onUpdateTask}
              onMoveTaskToList={onMoveTaskToList}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onIndentTask={onIndentTask}
              onOutdentTask={onOutdentTask}
              onReorderTasks={onReorderTasks}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
