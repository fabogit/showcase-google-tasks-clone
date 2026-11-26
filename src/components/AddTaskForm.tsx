import { useState, type FormEvent, type ReactElement } from "react";

interface AddTaskFormProps {
  readonly onAddTask: (title: string) => void;
  readonly placeholder?: string;
}

export default function AddTaskForm({
  onAddTask,
  placeholder = "Add a task...",
}: AddTaskFormProps): ReactElement {
  const [title, setTitle] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onAddTask(trimmed);
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="add-task-form" aria-label="Add new task form">
      <input
        type="text"
        placeholder={placeholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="add-task-input"
        aria-label="New task text"
      />
      <button type="submit" className="add-task-button">
        Add Task
      </button>
    </form>
  );
}
