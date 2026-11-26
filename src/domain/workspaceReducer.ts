import type { CalendarDate } from "./calendarDate";
import { normalizeTaskPositions } from "./schema";
import type {
  SortMode,
  TaskEntity,
  TaskListEntity,
  WorkspaceSnapshotV2,
  WorkspaceState,
} from "./types";

export type WorkspaceAction =
  | { readonly type: "HYDRATE"; readonly snapshot: WorkspaceSnapshotV2 }
  | {
      readonly type: "ADD_LIST";
      readonly id: string;
      readonly title: string;
      readonly now: number;
    }
  | {
      readonly type: "RENAME_LIST";
      readonly listId: string;
      readonly title: string;
      readonly now: number;
    }
  | {
      readonly type: "DELETE_LIST";
      readonly listId: string;
      readonly now: number;
      readonly undoId: string;
    }
  | {
      readonly type: "SET_LIST_SORT_MODE";
      readonly listId: string;
      readonly sortMode: SortMode;
      readonly now: number;
    }
  | {
      readonly type: "ADD_TASK";
      readonly id: string;
      readonly listId: string;
      readonly parentId?: string | null;
      readonly title: string;
      readonly notes?: string;
      readonly dueDate?: CalendarDate | null;
      readonly isStarred?: boolean;
      readonly now: number;
    }
  | {
      readonly type: "UPDATE_TASK";
      readonly taskId: string;
      readonly patch: {
        readonly title?: string;
        readonly notes?: string;
        readonly dueDate?: CalendarDate | null;
      };
      readonly now: number;
    }
  | {
      readonly type: "TOGGLE_TASK_COMPLETED";
      readonly taskId: string;
      readonly now: number;
      readonly undoId: string;
    }
  | {
      readonly type: "TOGGLE_TASK_STARRED";
      readonly taskId: string;
      readonly now: number;
    }
  | {
      readonly type: "DELETE_TASK";
      readonly taskId: string;
      readonly now: number;
      readonly undoId: string;
    }
  | {
      readonly type: "CLEAR_COMPLETED_TASKS";
      readonly listId: string;
      readonly now: number;
      readonly undoId: string;
    }
  | {
      readonly type: "MOVE_TASK_TO_LIST";
      readonly taskId: string;
      readonly targetListId: string;
      readonly now: number;
    }
  | {
      readonly type: "INDENT_TASK";
      readonly taskId: string;
      readonly targetParentId: string;
      readonly now: number;
    }
  | {
      readonly type: "OUTDENT_TASK";
      readonly taskId: string;
      readonly now: number;
    }
  | {
      readonly type: "REORDER_TASKS";
      readonly listId: string;
      readonly parentId: string | null;
      readonly orderedTaskIds: readonly string[];
      readonly now: number;
    }
  | { readonly type: "UNDO" }
  | { readonly type: "DISMISS_UNDO" };

export function createInitialWorkspaceState(snapshot: WorkspaceSnapshotV2): WorkspaceState {
  return {
    snapshot,
    undoEntry: null,
  };
}

function withUpdatedSnapshot(
  state: WorkspaceState,
  nextLists: readonly TaskListEntity[],
  nextTasks: readonly TaskEntity[],
  now: number,
  undo?: { readonly id: string; readonly label: string },
): WorkspaceState {
  const nextSnapshot: WorkspaceSnapshotV2 = {
    schemaVersion: state.snapshot.schemaVersion,
    lists: nextLists,
    tasks: nextTasks,
    updatedAt: now,
  };

  return {
    snapshot: nextSnapshot,
    undoEntry: undo
      ? {
          id: undo.id,
          label: undo.label,
          previousSnapshot: state.snapshot,
        }
      : state.undoEntry,
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  const { lists, tasks } = state.snapshot;

  switch (action.type) {
    case "HYDRATE": {
      return {
        snapshot: action.snapshot,
        undoEntry: null,
      };
    }

    case "ADD_LIST": {
      const title = action.title.trim();
      if (!title || lists.some((list) => list.id === action.id)) {
        return state;
      }

      const newList: TaskListEntity = {
        id: action.id,
        title,
        sortMode: "manual",
        createdAt: action.now,
        updatedAt: action.now,
      };

      return withUpdatedSnapshot(state, [...lists, newList], tasks, action.now);
    }

    case "RENAME_LIST": {
      const title = action.title.trim();
      if (!title) {
        return state;
      }

      const target = lists.find((list) => list.id === action.listId);
      if (!target || target.title === title) {
        return state;
      }

      const nextLists = lists.map((list) =>
        list.id === action.listId ? { ...list, title, updatedAt: action.now } : list,
      );

      return withUpdatedSnapshot(state, nextLists, tasks, action.now);
    }

    case "DELETE_LIST": {
      if (lists.length <= 1) {
        return state;
      }

      const target = lists.find((list) => list.id === action.listId);
      if (!target) {
        return state;
      }

      const nextLists = lists.filter((list) => list.id !== action.listId);
      const nextTasks = tasks.filter((task) => task.listId !== action.listId);

      return withUpdatedSnapshot(state, nextLists, nextTasks, action.now, {
        id: action.undoId,
        label: `Deleted list "${target.title}"`,
      });
    }

    case "SET_LIST_SORT_MODE": {
      const target = lists.find((list) => list.id === action.listId);
      if (!target || target.sortMode === action.sortMode) {
        return state;
      }

      const nextLists = lists.map((list) =>
        list.id === action.listId
          ? { ...list, sortMode: action.sortMode, updatedAt: action.now }
          : list,
      );

      return withUpdatedSnapshot(state, nextLists, tasks, action.now);
    }

    case "ADD_TASK": {
      const title = action.title.trim();
      if (!title) {
        return state;
      }
      if (!lists.some((list) => list.id === action.listId)) {
        return state;
      }
      if (tasks.some((task) => task.id === action.id)) {
        return state;
      }

      const parentId = action.parentId ?? null;
      if (parentId !== null) {
        const parent = tasks.find((task) => task.id === parentId);
        if (
          !parent ||
          parent.listId !== action.listId ||
          parent.parentId !== null ||
          parent.isCompleted
        ) {
          return state;
        }
      }

      const newTask: TaskEntity = {
        id: action.id,
        listId: action.listId,
        parentId,
        title,
        notes: action.notes ?? "",
        dueDate: action.dueDate ?? null,
        isCompleted: false,
        isStarred: action.isStarred ?? false,
        position: parentId === null ? -1 : Number.MAX_SAFE_INTEGER,
        createdAt: action.now,
        updatedAt: action.now,
        completedAt: null,
      };

      const nextTasks = normalizeTaskPositions([...tasks, newTask]);
      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "UPDATE_TASK": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (!target) {
        return state;
      }

      let nextTitle = target.title;
      if (action.patch.title !== undefined) {
        const trimmedTitle = action.patch.title.trim();
        if (!trimmedTitle) {
          return state;
        }
        nextTitle = trimmedTitle;
      }

      const nextNotes = action.patch.notes !== undefined ? action.patch.notes : target.notes;
      const nextDueDate =
        action.patch.dueDate !== undefined ? action.patch.dueDate : target.dueDate;

      if (
        nextTitle === target.title &&
        nextNotes === target.notes &&
        nextDueDate === target.dueDate
      ) {
        return state;
      }

      const nextTasks = tasks.map((task) =>
        task.id === action.taskId
          ? {
              ...task,
              title: nextTitle,
              notes: nextNotes,
              dueDate: nextDueDate,
              updatedAt: action.now,
            }
          : task,
      );

      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "TOGGLE_TASK_COMPLETED": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (!target) {
        return state;
      }

      if (!target.isCompleted) {
        // Completing a task also completes all of its active subtasks.
        const nextTasks = tasks.map((task) => {
          if (task.id === target.id) {
            return {
              ...task,
              isCompleted: true,
              completedAt: action.now,
              updatedAt: action.now,
            };
          }
          if (task.parentId === target.id && !task.isCompleted) {
            return {
              ...task,
              isCompleted: true,
              completedAt: action.now,
              updatedAt: action.now,
            };
          }
          return task;
        });

        return withUpdatedSnapshot(state, lists, nextTasks, action.now, {
          id: action.undoId,
          label: "Task completed",
        });
      }

      // Reopening a root task also reopens all of its completed subtasks.
      // Reopening a subtask also reopens its completed parent so no active
      // subtask remains orphaned under a completed parent.
      const reopenParentId = target.parentId;
      const isReopeningRoot = reopenParentId === null;
      const nextTasks = tasks.map((task) => {
        if (task.id === target.id) {
          return {
            ...task,
            isCompleted: false,
            completedAt: null,
            updatedAt: action.now,
          };
        }
        if (isReopeningRoot && task.parentId === target.id && task.isCompleted) {
          return {
            ...task,
            isCompleted: false,
            completedAt: null,
            updatedAt: action.now,
          };
        }
        if (reopenParentId !== null && task.id === reopenParentId && task.isCompleted) {
          return {
            ...task,
            isCompleted: false,
            completedAt: null,
            updatedAt: action.now,
          };
        }
        return task;
      });

      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "TOGGLE_TASK_STARRED": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (!target) {
        return state;
      }

      const nextTasks = tasks.map((task) =>
        task.id === action.taskId
          ? {
              ...task,
              isStarred: !task.isStarred,
              updatedAt: action.now,
            }
          : task,
      );

      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "DELETE_TASK": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (!target) {
        return state;
      }

      const remaining = tasks.filter(
        (task) => task.id !== action.taskId && task.parentId !== action.taskId,
      );
      const nextTasks = normalizeTaskPositions(remaining);

      return withUpdatedSnapshot(state, lists, nextTasks, action.now, {
        id: action.undoId,
        label: "Task deleted",
      });
    }

    case "CLEAR_COMPLETED_TASKS": {
      if (!lists.some((list) => list.id === action.listId)) {
        return state;
      }

      const removedIds = new Set<string>();
      for (const task of tasks) {
        if (task.listId === action.listId && task.isCompleted) {
          removedIds.add(task.id);
        }
      }

      if (removedIds.size === 0) {
        return state;
      }

      // Also drop any subtask whose parent is being removed to prevent dangling refs.
      const remaining = tasks.filter(
        (task) =>
          !removedIds.has(task.id) && (task.parentId === null || !removedIds.has(task.parentId)),
      );
      const removedCount = tasks.length - remaining.length;
      const nextTasks = normalizeTaskPositions(remaining);

      return withUpdatedSnapshot(state, lists, nextTasks, action.now, {
        id: action.undoId,
        label: `Cleared ${removedCount} completed task${removedCount === 1 ? "" : "s"}`,
      });
    }

    case "MOVE_TASK_TO_LIST": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (
        !target ||
        target.listId === action.targetListId ||
        !lists.some((list) => list.id === action.targetListId)
      ) {
        return state;
      }

      const movedTasks = tasks.map((task) => {
        if (task.id === target.id) {
          return {
            ...task,
            listId: action.targetListId,
            parentId: null,
            position: -1,
            updatedAt: action.now,
          };
        }
        if (target.parentId === null && task.parentId === target.id) {
          return {
            ...task,
            listId: action.targetListId,
            updatedAt: action.now,
          };
        }
        return task;
      });

      const nextTasks = normalizeTaskPositions(movedTasks);
      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "INDENT_TASK": {
      const target = tasks.find((task) => task.id === action.taskId);
      const targetParent = tasks.find((task) => task.id === action.targetParentId);

      if (
        !target ||
        !targetParent ||
        target.id === targetParent.id ||
        target.listId !== targetParent.listId ||
        target.parentId !== null ||
        targetParent.parentId !== null ||
        targetParent.isCompleted
      ) {
        return state;
      }

      const hasSubtasks = tasks.some((task) => task.parentId === target.id);
      if (hasSubtasks) {
        return state;
      }

      const indented = tasks.map((task) =>
        task.id === target.id
          ? {
              ...task,
              parentId: targetParent.id,
              position: Number.MAX_SAFE_INTEGER,
              updatedAt: action.now,
            }
          : task,
      );

      const nextTasks = normalizeTaskPositions(indented);
      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "OUTDENT_TASK": {
      const target = tasks.find((task) => task.id === action.taskId);
      if (!target || target.parentId === null) {
        return state;
      }

      const parent = tasks.find((task) => task.id === target.parentId);
      const promotedPosition = parent ? parent.position + 0.5 : target.position;

      const outdented = tasks.map((task) =>
        task.id === target.id
          ? {
              ...task,
              parentId: null,
              position: promotedPosition,
              updatedAt: action.now,
            }
          : task,
      );

      const nextTasks = normalizeTaskPositions(outdented);
      return withUpdatedSnapshot(state, lists, nextTasks, action.now);
    }

    case "REORDER_TASKS": {
      const list = lists.find((item) => item.id === action.listId);
      if (!list) {
        return state;
      }

      const orderIndexById = new Map<string, number>();
      action.orderedTaskIds.forEach((id, index) => {
        if (!orderIndexById.has(id)) {
          orderIndexById.set(id, index);
        }
      });

      const baseUnmatchedOffset = action.orderedTaskIds.length;
      const reordered = tasks.map((task) => {
        if (task.listId !== action.listId || task.parentId !== action.parentId) {
          return task;
        }
        const explicitOrder = orderIndexById.get(task.id);
        const nextPosition =
          explicitOrder !== undefined ? explicitOrder : baseUnmatchedOffset + task.position;

        return {
          ...task,
          position: nextPosition,
          updatedAt: action.now,
        };
      });

      const nextTasks = normalizeTaskPositions(reordered);
      const nextLists =
        action.parentId === null && list.sortMode !== "manual"
          ? lists.map((item) =>
              item.id === action.listId
                ? { ...item, sortMode: "manual" as const, updatedAt: action.now }
                : item,
            )
          : lists;

      return withUpdatedSnapshot(state, nextLists, nextTasks, action.now);
    }

    case "UNDO": {
      if (!state.undoEntry) {
        return state;
      }
      return {
        snapshot: state.undoEntry.previousSnapshot,
        undoEntry: null,
      };
    }

    case "DISMISS_UNDO": {
      if (!state.undoEntry) {
        return state;
      }
      return {
        ...state,
        undoEntry: null,
      };
    }
  }
}
