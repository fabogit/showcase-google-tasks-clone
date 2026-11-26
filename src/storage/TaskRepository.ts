import type { WorkspaceLoadSource } from "../domain/schema";
import type { WorkspaceSnapshotV2 } from "../domain/types";

export type StorageErrorCode =
  | "QUOTA_EXCEEDED"
  | "ACCESS_DENIED"
  | "SERIALIZATION_ERROR"
  | "UNKNOWN";

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  override readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;
  }
}

export interface LoadWorkspaceResult {
  readonly snapshot: WorkspaceSnapshotV2;
  readonly source: WorkspaceLoadSource;
  readonly warning?: string;
}

/**
 * Asynchronous persistence contract designed so v2 LocalStorage can be swapped
 * cleanly for IndexedDB + BroadcastChannel without rewriting UI/domain code.
 */
export interface TaskRepository {
  load(): Promise<LoadWorkspaceResult>;
  save(snapshot: WorkspaceSnapshotV2): Promise<void>;
  subscribe(listener: (snapshot: WorkspaceSnapshotV2) => void): () => void;
}
