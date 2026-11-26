import { describe, expect, it } from "vite-plus/test";
import { createEmptyWorkspace } from "./schema";
import {
  createInitialWorkspaceState,
  workspaceReducer,
  type WorkspaceAction,
} from "./workspaceReducer";

function applyActions(
  actions: readonly WorkspaceAction[],
  initial = createInitialWorkspaceState(
    createEmptyWorkspace({ now: () => 100, createId: () => "list-1" }),
  ),
) {
  return actions.reduce(workspaceReducer, initial);
}

describe("workspaceReducer", () => {
  it("creates, renames, sorts, and guards deletion of the last list", () => {
    let state = applyActions([
      { type: "ADD_LIST", id: "list-2", title: "  Shopping  ", now: 101 },
      { type: "RENAME_LIST", listId: "list-2", title: "Groceries", now: 102 },
      {
        type: "SET_LIST_SORT_MODE",
        listId: "list-2",
        sortMode: "title",
        now: 103,
      },
      {
        type: "ADD_TASK",
        id: "t1",
        listId: "list-2",
        title: "Apples",
        now: 104,
      },
    ]);

    expect(state.snapshot.lists).toHaveLength(2);
    expect(state.snapshot.lists[1].title).toBe("Groceries");
    expect(state.snapshot.lists[1].sortMode).toBe("title");

    // Delete second list and its tasks, then undo atomically
    state = workspaceReducer(state, {
      type: "DELETE_LIST",
      listId: "list-2",
      now: 105,
      undoId: "undo-1",
    });
    expect(state.snapshot.lists).toHaveLength(1);
    expect(state.snapshot.tasks).toHaveLength(0);
    expect(state.undoEntry?.label).toBe('Deleted list "Groceries"');

    // Cannot delete last remaining list
    const unchanged = workspaceReducer(state, {
      type: "DELETE_LIST",
      listId: "list-1",
      now: 106,
      undoId: "undo-2",
    });
    expect(unchanged).toBe(state);
    expect(unchanged.snapshot.lists).toHaveLength(1);

    // Undo restores list and its task
    state = workspaceReducer(state, { type: "UNDO" });
    expect(state.snapshot.lists).toHaveLength(2);
    expect(state.snapshot.tasks).toHaveLength(1);
    expect(state.undoEntry).toBeNull();
  });

  it("completes parent + subtasks together and reopens parent when uncompleting a subtask", () => {
    let state = applyActions([
      { type: "ADD_TASK", id: "p1", listId: "list-1", title: "Parent", now: 10 },
      {
        type: "ADD_TASK",
        id: "c1",
        listId: "list-1",
        parentId: "p1",
        title: "Child 1",
        now: 11,
      },
      {
        type: "ADD_TASK",
        id: "c2",
        listId: "list-1",
        parentId: "p1",
        title: "Child 2",
        now: 12,
      },
    ]);

    state = workspaceReducer(state, {
      type: "TOGGLE_TASK_COMPLETED",
      taskId: "p1",
      now: 20,
      undoId: "u1",
    });

    expect(state.snapshot.tasks.every((t) => t.isCompleted)).toBe(true);
    expect(state.undoEntry?.label).toBe("Task completed");

    // Uncompleting child reopens both child and parent
    state = workspaceReducer(state, {
      type: "TOGGLE_TASK_COMPLETED",
      taskId: "c1",
      now: 30,
      undoId: "u2",
    });
    const byId = new Map(state.snapshot.tasks.map((t) => [t.id, t]));
    expect(byId.get("c1")?.isCompleted).toBe(false);
    expect(byId.get("p1")?.isCompleted).toBe(false);
    expect(byId.get("c2")?.isCompleted).toBe(true);
  });

  it("deletes parent + subtasks atomically and supports undo + dismiss", () => {
    let state = applyActions([
      { type: "ADD_TASK", id: "p1", listId: "list-1", title: "Parent", now: 10 },
      {
        type: "ADD_TASK",
        id: "c1",
        listId: "list-1",
        parentId: "p1",
        title: "Child",
        now: 11,
      },
      {
        type: "ADD_TASK",
        id: "r2",
        listId: "list-1",
        title: "Other",
        now: 12,
      },
    ]);

    state = workspaceReducer(state, {
      type: "DELETE_TASK",
      taskId: "p1",
      now: 20,
      undoId: "undo-del",
    });

    expect(state.snapshot.tasks.map((t) => t.id)).toEqual(["r2"]);
    expect(state.undoEntry?.label).toBe("Task deleted");

    state = workspaceReducer(state, { type: "UNDO" });
    expect(state.snapshot.tasks.map((t) => t.id)).toEqual(["p1", "c1", "r2"]);

    // Verify DISMISS_UNDO clears active undo entry
    state = workspaceReducer(state, {
      type: "DELETE_TASK",
      taskId: "r2",
      now: 25,
      undoId: "undo-del-2",
    });
    state = workspaceReducer(state, { type: "DISMISS_UNDO" });
    expect(state.undoEntry).toBeNull();
  });

  it("enforces 1-level indent/outdent guards and moves root + subtasks across lists", () => {
    let state = applyActions([
      { type: "ADD_LIST", id: "list-2", title: "Target", now: 1 },
      { type: "ADD_TASK", id: "a", listId: "list-1", title: "Task A", now: 2 },
      { type: "ADD_TASK", id: "b", listId: "list-1", title: "Task B", now: 3 },
      { type: "ADD_TASK", id: "c", listId: "list-1", title: "Task C", now: 4 },
    ]);

    // Indent C under B
    state = workspaceReducer(state, {
      type: "INDENT_TASK",
      taskId: "c",
      targetParentId: "b",
      now: 5,
    });
    expect(state.snapshot.tasks.find((t) => t.id === "c")?.parentId).toBe("b");

    // Cannot indent B (which now has subtask C) under A
    const blockedIndent = workspaceReducer(state, {
      type: "INDENT_TASK",
      taskId: "b",
      targetParentId: "a",
      now: 6,
    });
    expect(blockedIndent).toBe(state);

    // Move B (and its child C) to list-2
    state = workspaceReducer(state, {
      type: "MOVE_TASK_TO_LIST",
      taskId: "b",
      targetListId: "list-2",
      now: 7,
    });
    expect(state.snapshot.tasks.find((t) => t.id === "b")?.listId).toBe("list-2");
    expect(state.snapshot.tasks.find((t) => t.id === "c")?.listId).toBe("list-2");
    expect(state.snapshot.tasks.find((t) => t.id === "c")?.parentId).toBe("b");

    // Outdent C back to root in list-2
    state = workspaceReducer(state, {
      type: "OUTDENT_TASK",
      taskId: "c",
      now: 8,
    });
    expect(state.snapshot.tasks.find((t) => t.id === "c")?.parentId).toBeNull();
  });

  it("reorders tasks, resets sortMode to manual, updates metadata, and clears completed", () => {
    let state = applyActions([
      {
        type: "SET_LIST_SORT_MODE",
        listId: "list-1",
        sortMode: "title",
        now: 1,
      },
      { type: "ADD_TASK", id: "t1", listId: "list-1", title: "First", now: 2 },
      { type: "ADD_TASK", id: "t2", listId: "list-1", title: "Second", now: 3 },
      {
        type: "UPDATE_TASK",
        taskId: "t1",
        patch: {
          title: "First edited",
          notes: "Details",
          dueDate: "2026-12-01",
        },
        now: 4,
      },
      { type: "TOGGLE_TASK_STARRED", taskId: "t1", now: 5 },
      {
        type: "REORDER_TASKS",
        listId: "list-1",
        parentId: null,
        orderedTaskIds: ["t1", "t2"],
        now: 6,
      },
      {
        type: "TOGGLE_TASK_COMPLETED",
        taskId: "t2",
        now: 7,
        undoId: "u-complete",
      },
    ]);

    expect(state.snapshot.lists[0].sortMode).toBe("manual");
    const t1 = state.snapshot.tasks.find((t) => t.id === "t1");
    expect(t1?.title).toBe("First edited");
    expect(t1?.notes).toBe("Details");
    expect(t1?.dueDate).toBe("2026-12-01");
    expect(t1?.isStarred).toBe(true);
    expect(t1?.position).toBe(0);

    state = workspaceReducer(state, {
      type: "CLEAR_COMPLETED_TASKS",
      listId: "list-1",
      now: 8,
      undoId: "u-clear",
    });
    expect(state.snapshot.tasks.map((t) => t.id)).toEqual(["t1"]);
    expect(state.undoEntry?.label).toBe("Cleared 1 completed task");
  });
});
