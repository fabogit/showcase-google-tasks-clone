import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TaskTreeItem } from "../domain/selectors";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import type { TaskUpdatePatch } from "./TaskItem";
import { TaskTreeList } from "./TaskTreeList";

const LIST: TaskListEntity = {
  id: "l1",
  title: "My Tasks",
  sortMode: "manual",
  createdAt: 1,
  updatedAt: 1,
};

function makeTask(overrides: Partial<TaskEntity> & { id: string; title: string }): TaskEntity {
  return {
    listId: "l1",
    parentId: null,
    notes: "",
    dueDate: null,
    isCompleted: false,
    isStarred: false,
    position: 0,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    ...overrides,
  };
}

function renderTree(
  items: readonly TaskTreeItem[],
  overrides?: {
    onAddSubtask?: (parentId: string, title: string) => void;
    onIndentTask?: (taskId: string, targetParentId: string) => void;
    onOutdentTask?: (taskId: string) => void;
    onReorderTasks?: (parentId: string | null, orderedTaskIds: readonly string[]) => void;
  },
) {
  const onAddSubtask =
    overrides?.onAddSubtask ?? vi.fn<(parentId: string, title: string) => void>();
  const onIndentTask =
    overrides?.onIndentTask ?? vi.fn<(taskId: string, targetParentId: string) => void>();
  const onOutdentTask = overrides?.onOutdentTask ?? vi.fn<(taskId: string) => void>();
  const onReorderTasks =
    overrides?.onReorderTasks ??
    vi.fn<(parentId: string | null, orderedTaskIds: readonly string[]) => void>();

  const utils = render(
    <TaskTreeList
      items={items}
      lists={[LIST]}
      expandedTaskId={null}
      onToggleExpand={vi.fn<(taskId: string) => void>()}
      onToggleComplete={vi.fn<(taskId: string) => void>()}
      onToggleStarred={vi.fn<(taskId: string) => void>()}
      onUpdateTask={vi.fn<(taskId: string, patch: TaskUpdatePatch) => void>()}
      onMoveTaskToList={vi.fn<(taskId: string, targetListId: string) => void>()}
      onDeleteTask={vi.fn<(taskId: string) => void>()}
      onAddSubtask={onAddSubtask}
      onIndentTask={onIndentTask}
      onOutdentTask={onOutdentTask}
      onReorderTasks={onReorderTasks}
    />,
  );

  return {
    ...utils,
    onAddSubtask,
    onIndentTask,
    onOutdentTask,
    onReorderTasks,
  };
}

describe("TaskTreeList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports inline subtask creation with Enter and Escape", async () => {
    const user = userEvent.setup();
    const onAddSubtask = vi.fn<(parentId: string, title: string) => void>();
    renderTree([{ task: makeTask({ id: "r1", title: "Plan trip" }), subtasks: [] }], {
      onAddSubtask,
    });

    await user.click(screen.getByRole("button", { name: 'Add subtask to "Plan trip"' }));
    const input = screen.getByLabelText("New subtask text");
    expect(input).toHaveFocus();

    await user.type(input, "{Escape}");
    expect(screen.queryByLabelText("New subtask text")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: 'Add subtask to "Plan trip"' }));
    await user.type(screen.getByLabelText("New subtask text"), "Book flights{Enter}");

    expect(onAddSubtask).toHaveBeenCalledWith("r1", "Book flights");
    expect(screen.queryByLabelText("New subtask text")).not.toBeInTheDocument();
  });

  it("supports indent/outdent buttons and Ctrl+]/Ctrl+[ shortcuts while guarding parents with subtasks", async () => {
    const user = userEvent.setup();
    const onIndentTask = vi.fn<(taskId: string, targetParentId: string) => void>();
    const onOutdentTask = vi.fn<(taskId: string) => void>();

    renderTree(
      [
        {
          task: makeTask({ id: "r1", title: "Parent" }),
          subtasks: [makeTask({ id: "s1", parentId: "r1", title: "Child" })],
        },
        {
          task: makeTask({ id: "r2", title: "Second root", position: 1 }),
          subtasks: [],
        },
      ],
      { onIndentTask, onOutdentTask },
    );

    // First root (and any root with subtasks) cannot be indented
    expect(
      screen.queryByRole("button", { name: 'Make "Parent" a subtask' }),
    ).not.toBeInTheDocument();

    // Second root can indent via button and Ctrl+]
    const indentBtn = screen.getByRole("button", {
      name: 'Make "Second root" a subtask',
    });
    await user.click(indentBtn);
    expect(onIndentTask).toHaveBeenCalledWith("r2", "r1");

    const r2Row = indentBtn.closest(".task-row");
    expect(r2Row).not.toBeNull();
    if (r2Row) {
      fireEvent.keyDown(r2Row, { key: "]", ctrlKey: true });
    }
    expect(onIndentTask).toHaveBeenCalledTimes(2);

    // Subtask can outdent via button and Ctrl+[
    const outdentBtn = screen.getByRole("button", {
      name: 'Move "Child" to top level',
    });
    await user.click(outdentBtn);
    expect(onOutdentTask).toHaveBeenCalledWith("s1");

    const subRow = outdentBtn.closest(".task-row");
    expect(subRow).not.toBeNull();
    if (subRow) {
      fireEvent.keyDown(subRow, { key: "[", ctrlKey: true });
    }
    expect(onOutdentTask).toHaveBeenCalledTimes(2);
  });

  it("reorders root tasks via accessible keyboard drag-and-drop", async () => {
    const user = userEvent.setup();
    const onReorderTasks =
      vi.fn<(parentId: string | null, orderedTaskIds: readonly string[]) => void>();

    // Provide deterministic vertical geometry so sortableKeyboardCoordinates resolves ArrowDown in jsdom
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ): DOMRect {
      const listItems = Array.from(document.querySelectorAll("ul.task-tree-list > li"));
      const idx = listItems.indexOf(this);
      const top = idx >= 0 ? idx * 56 : 0;
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        right: 400,
        bottom: top + 56,
        width: 400,
        height: 56,
        toJSON: () => ({}),
      } as DOMRect;
    });

    renderTree(
      [
        { task: makeTask({ id: "r1", title: "Alpha", position: 0 }), subtasks: [] },
        { task: makeTask({ id: "r2", title: "Beta", position: 1 }), subtasks: [] },
      ],
      { onReorderTasks },
    );

    const handle = screen.getByRole("button", { name: 'Reorder task "Alpha"' });
    handle.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");

    expect(onReorderTasks).toHaveBeenCalledWith(null, ["r2", "r1"]);

    // Verify subtask list semantic landmark
    expect(within(document.body).queryByRole("list")).toBeInTheDocument();
  });
});
