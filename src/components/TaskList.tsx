import type { ReactElement } from "react";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import TaskItem, { type TaskUpdatePatch } from "./TaskItem";

interface TaskListProps {
  readonly tasks: readonly TaskEntity[];
  readonly lists: readonly TaskListEntity[];
  readonly listTitleById?: ReadonlyMap<string, string>;
  readonly expandedTaskId: string | null;
  readonly onToggleExpand: (taskId: string) => void;
  readonly onToggleComplete: (taskId: string) => void;
  readonly onToggleStarred: (taskId: string) => void;
  readonly onUpdateTask: (taskId: string, patch: TaskUpdatePatch) => void;
  readonly onMoveTaskToList: (taskId: string, targetListId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
}

export default function TaskList({
  tasks,
  lists,
  listTitleById,
  expandedTaskId,
  onToggleExpand,
  onToggleComplete,
  onToggleStarred,
  onUpdateTask,
  onMoveTaskToList,
  onDeleteTask,
}: TaskListProps): ReactElement {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          lists={lists}
          listTitle={listTitleById?.get(task.listId)}
          showSubtaskBadge={task.parentId !== null}
          isExpanded={expandedTaskId === task.id}
          onToggleExpand={onToggleExpand}
          onToggleComplete={onToggleComplete}
          onToggleStarred={onToggleStarred}
          onUpdateTask={onUpdateTask}
          onMoveTaskToList={onMoveTaskToList}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </ul>
  );
}
