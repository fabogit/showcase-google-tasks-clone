import { createId as defaultCreateId } from "../utils/id";
import { isCalendarDate } from "./calendarDate";
import {
  DEFAULT_LIST_TITLE,
  WORKSPACE_SCHEMA_VERSION,
  type SortMode,
  type TaskEntity,
  type TaskListEntity,
  type WorkspaceSnapshotV2,
} from "./types";

export interface WorkspaceFactoryOptions {
  readonly now?: () => number;
  readonly createId?: () => string;
}

export type WorkspaceLoadSource = "v2" | "migrated-v1" | "fresh";

export interface ResolvedWorkspace {
  readonly snapshot: WorkspaceSnapshotV2;
  readonly source: WorkspaceLoadSource;
  readonly warning?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSortMode(value: unknown): value is SortMode {
  return value === "manual" || value === "dueDate" || value === "title";
}

/**
 * Creates a fresh v2 workspace containing a single default task list.
 */
export function createEmptyWorkspace(options?: WorkspaceFactoryOptions): WorkspaceSnapshotV2 {
  const now = options?.now ?? Date.now;
  const generateId = options?.createId ?? defaultCreateId;
  const timestamp = now();

  const defaultList: TaskListEntity = {
    id: generateId(),
    title: DEFAULT_LIST_TITLE,
    sortMode: "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    lists: [defaultList],
    tasks: [],
    updatedAt: timestamp,
  };
}

/**
 * Normalizes sibling task `position` values into dense `0, 1, 2, ...` integers
 * within each `(listId, parentId)` group, preserving relative order.
 */
export function normalizeTaskPositions(tasks: readonly TaskEntity[]): TaskEntity[] {
  const groups = new Map<string, TaskEntity[]>();

  for (const task of tasks) {
    const key = `${task.listId}::${task.parentId ?? "__root__"}`;
    const group = groups.get(key);
    if (group) {
      group.push(task);
    } else {
      groups.set(key, [task]);
    }
  }

  const normalizedPositionById = new Map<string, number>();

  for (const group of groups.values()) {
    group.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.createdAt - b.createdAt;
    });

    for (let index = 0; index < group.length; index += 1) {
      normalizedPositionById.set(group[index].id, index);
    }
  }

  return tasks.map((task) => {
    const nextPosition = normalizedPositionById.get(task.id) ?? 0;
    return task.position === nextPosition ? task : { ...task, position: nextPosition };
  });
}

function parseTaskListEntity(raw: unknown): TaskListEntity | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.title) ||
    !isSortMode(raw.sortMode) ||
    !isFiniteNumber(raw.createdAt) ||
    !isFiniteNumber(raw.updatedAt)
  ) {
    return null;
  }

  return {
    id: raw.id,
    title: raw.title.trim(),
    sortMode: raw.sortMode,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function parseTaskEntity(raw: unknown, validListIds: ReadonlySet<string>): TaskEntity | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.listId) ||
    !validListIds.has(raw.listId) ||
    !isNonEmptyString(raw.title) ||
    typeof raw.notes !== "string" ||
    typeof raw.isCompleted !== "boolean" ||
    typeof raw.isStarred !== "boolean" ||
    !isFiniteNumber(raw.position) ||
    !isFiniteNumber(raw.createdAt) ||
    !isFiniteNumber(raw.updatedAt)
  ) {
    return null;
  }

  let parentId: string | null;
  if (raw.parentId === null) {
    parentId = null;
  } else if (isNonEmptyString(raw.parentId)) {
    parentId = raw.parentId;
  } else {
    return null;
  }

  let dueDate: TaskEntity["dueDate"];
  if (raw.dueDate === null) {
    dueDate = null;
  } else if (isCalendarDate(raw.dueDate)) {
    dueDate = raw.dueDate;
  } else {
    return null;
  }

  let completedAt: number | null;
  if (raw.completedAt === null) {
    completedAt = null;
  } else if (isFiniteNumber(raw.completedAt)) {
    completedAt = raw.completedAt;
  } else {
    return null;
  }

  return {
    id: raw.id,
    listId: raw.listId,
    parentId,
    title: raw.title.trim(),
    notes: raw.notes,
    dueDate,
    isCompleted: raw.isCompleted,
    isStarred: raw.isStarred,
    position: raw.position,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.isCompleted ? (completedAt ?? raw.updatedAt) : null,
  };
}

/**
 * Strictly validates an untrusted value as a `WorkspaceSnapshotV2`.
 * Enforces 1-level subtask invariants, deduplicates IDs, and normalizes positions.
 */
export function parseWorkspaceSnapshotV2(raw: unknown): WorkspaceSnapshotV2 | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    raw.schemaVersion !== WORKSPACE_SCHEMA_VERSION ||
    !Array.isArray(raw.lists) ||
    !Array.isArray(raw.tasks)
  ) {
    return null;
  }

  const lists: TaskListEntity[] = [];
  const validListIds = new Set<string>();

  for (const item of raw.lists) {
    const list = parseTaskListEntity(item);
    if (list && !validListIds.has(list.id)) {
      validListIds.add(list.id);
      lists.push(list);
    }
  }

  if (lists.length === 0) {
    return null;
  }

  const parsedTasks: TaskEntity[] = [];
  const taskById = new Map<string, TaskEntity>();

  for (const item of raw.tasks) {
    const task = parseTaskEntity(item, validListIds);
    if (task && !taskById.has(task.id)) {
      taskById.set(task.id, task);
      parsedTasks.push(task);
    }
  }

  // Enforce 1-level subtask invariant: parent must exist, be in the same list,
  // not be the task itself, and itself be a root task.
  const validParentIds = new Set<string>();
  for (const task of parsedTasks) {
    if (task.parentId === null) {
      validParentIds.add(task.id);
    }
  }

  const enforcedTasks = parsedTasks.map((task) => {
    if (task.parentId === null) {
      return task;
    }

    const parent = taskById.get(task.parentId);
    const isValidParent =
      parent !== undefined &&
      parent.id !== task.id &&
      parent.listId === task.listId &&
      validParentIds.has(parent.id);

    return isValidParent ? task : { ...task, parentId: null };
  });

  const normalizedTasks = normalizeTaskPositions(enforcedTasks);

  let updatedAt: number;
  if (isFiniteNumber(raw.updatedAt)) {
    updatedAt = raw.updatedAt;
  } else {
    updatedAt = lists.reduce((max, list) => Math.max(max, list.updatedAt), 0);
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    lists,
    tasks: normalizedTasks,
    updatedAt,
  };
}

/**
 * Migrates legacy v1 `gugleTascTasks` (`Task[]`) payloads into `WorkspaceSnapshotV2`.
 * Returns `null` if `raw` is not an array.
 */
export function migrateLegacyV1Tasks(
  raw: unknown,
  options?: WorkspaceFactoryOptions,
): WorkspaceSnapshotV2 | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const now = options?.now ?? Date.now;
  const generateId = options?.createId ?? defaultCreateId;
  const timestamp = now();

  const defaultList: TaskListEntity = {
    id: generateId(),
    title: DEFAULT_LIST_TITLE,
    sortMode: "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const seenIds = new Set<string>();
  const tasks: TaskEntity[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    if (
      !isNonEmptyString(entry.id) ||
      !isNonEmptyString(entry.text) ||
      typeof entry.isCompleted !== "boolean"
    ) {
      continue;
    }
    if (seenIds.has(entry.id)) {
      continue;
    }
    seenIds.add(entry.id);

    tasks.push({
      id: entry.id,
      listId: defaultList.id,
      parentId: null,
      title: entry.text.trim(),
      notes: "",
      dueDate: null,
      isCompleted: entry.isCompleted,
      isStarred: false,
      position: tasks.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: entry.isCompleted ? timestamp : null,
    });
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    lists: [defaultList],
    tasks,
    updatedAt: timestamp,
  };
}

/**
 * Resolves a workspace snapshot from raw v2 and/or legacy v1 payloads.
 */
export function parseOrMigrateWorkspace(
  input: { readonly v2Raw?: unknown; readonly legacyV1Raw?: unknown },
  options?: WorkspaceFactoryOptions,
): ResolvedWorkspace {
  const hasV2 = input.v2Raw !== undefined;
  const hasV1 = input.legacyV1Raw !== undefined;

  if (hasV2) {
    const parsedV2 = parseWorkspaceSnapshotV2(input.v2Raw);
    if (parsedV2) {
      return { snapshot: parsedV2, source: "v2" };
    }
  }

  if (hasV1) {
    const migrated = migrateLegacyV1Tasks(input.legacyV1Raw, options);
    if (migrated) {
      return {
        snapshot: migrated,
        source: "migrated-v1",
        ...(hasV2
          ? {
              warning: "Stored workspace v2 data was invalid and recovered from legacy v1 tasks.",
            }
          : {}),
      };
    }
  }

  if (hasV2 || hasV1) {
    return {
      snapshot: createEmptyWorkspace(options),
      source: "fresh",
      warning:
        "Stored workspace data was corrupted and could not be recovered. Initialized a fresh workspace.",
    };
  }

  return {
    snapshot: createEmptyWorkspace(options),
    source: "fresh",
  };
}
