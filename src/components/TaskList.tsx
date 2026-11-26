import type { ReactElement } from "react";
import type { TaskEntity } from "../domain/types";
import TaskItem from "./TaskItem";

interface TaskListProps {
  readonly tasks: readonly TaskEntity[];
  readonly listTitleById?: ReadonlyMap<string, string>;
  readonly onToggleComplete: (id: string) => void;
  readonly onDeleteTask: (id: string) => void;
  readonly onEditTask: (id: string, newTitle: string) => void;
}

export default function TaskList({
  tasks,
  listTitleById,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
}: TaskListProps): ReactElement {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          listTitle={listTitleById?.get(task.listId)}
          onToggleComplete={onToggleComplete}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
        />
      ))}
    </ul>
  );
}
