import type { CalendarDate } from "./calendarDate";

export const WORKSPACE_SCHEMA_VERSION = 2 as const;

export const DEFAULT_LIST_TITLE = "My Tasks";

export type SortMode = "manual" | "dueDate" | "title";

export interface TaskListEntity {
  readonly id: string;
  readonly title: string;
  readonly sortMode: SortMode;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TaskEntity {
  readonly id: string;
  readonly listId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly notes: string;
  readonly dueDate: CalendarDate | null;
  readonly isCompleted: boolean;
  readonly isStarred: boolean;
  readonly position: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly completedAt: number | null;
}

export interface WorkspaceSnapshotV2 {
  readonly schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  readonly lists: readonly TaskListEntity[];
  readonly tasks: readonly TaskEntity[];
  readonly updatedAt: number;
}

export interface LegacyTaskV1 {
  readonly id: string;
  readonly text: string;
  readonly isCompleted: boolean;
}

export interface UndoEntry {
  readonly id: string;
  readonly label: string;
  readonly previousSnapshot: WorkspaceSnapshotV2;
}

export interface WorkspaceState {
  readonly snapshot: WorkspaceSnapshotV2;
  readonly undoEntry: UndoEntry | null;
}
