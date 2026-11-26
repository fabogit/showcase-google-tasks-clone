import {
  createEmptyWorkspace,
  parseOrMigrateWorkspace,
  parseWorkspaceSnapshotV2,
  type WorkspaceFactoryOptions,
} from "../domain/schema";
import type { WorkspaceSnapshotV2 } from "../domain/types";
import { StorageError, type LoadWorkspaceResult, type TaskRepository } from "./TaskRepository";

export const WORKSPACE_V2_STORAGE_KEY = "googleTasksClone.workspace.v2";
export const LEGACY_V1_STORAGE_KEY = "gugleTascTasks";

const CORRUPT_JSON_SENTINEL = Symbol("corrupt-json");

export interface LocalStorageTaskRepositoryOptions {
  readonly storage?: Storage | null;
  readonly eventTarget?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  readonly now?: () => number;
  readonly createId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  ) {
    return true;
  }

  if (isRecord(error)) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return false;
}

function isSecurityError(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "SecurityError"
  ) {
    return true;
  }

  return isRecord(error) && error.name === "SecurityError";
}

function safeParseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    return CORRUPT_JSON_SENTINEL;
  }
}

export class LocalStorageTaskRepository implements TaskRepository {
  private readonly storage: Storage | null;
  private readonly eventTarget: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  private readonly factoryOptions: WorkspaceFactoryOptions;

  constructor(options?: LocalStorageTaskRepositoryOptions) {
    this.storage = options && options.storage !== undefined ? options.storage : getDefaultStorage();
    this.eventTarget =
      options && options.eventTarget !== undefined
        ? options.eventTarget
        : typeof window !== "undefined"
          ? window
          : null;
    this.factoryOptions = {
      now: options?.now,
      createId: options?.createId,
    };
  }

  async load(): Promise<LoadWorkspaceResult> {
    if (!this.storage) {
      return {
        snapshot: createEmptyWorkspace(this.factoryOptions),
        source: "fresh",
        warning: "Local storage is unavailable. Running in memory-only mode.",
      };
    }

    let v2Text: string | null;
    try {
      v2Text = this.storage.getItem(WORKSPACE_V2_STORAGE_KEY);
    } catch {
      return {
        snapshot: createEmptyWorkspace(this.factoryOptions),
        source: "fresh",
        warning: "Local storage access was denied. Running in memory-only mode.",
      };
    }

    const v2Raw = v2Text !== null ? safeParseJson(v2Text) : undefined;
    if (v2Raw !== undefined && v2Raw !== CORRUPT_JSON_SENTINEL) {
      const parsedV2 = parseWorkspaceSnapshotV2(v2Raw);
      if (parsedV2) {
        return { snapshot: parsedV2, source: "v2" };
      }
    }

    let legacyText: string | null = null;
    try {
      legacyText = this.storage.getItem(LEGACY_V1_STORAGE_KEY);
    } catch {
      legacyText = null;
    }

    const legacyV1Raw = legacyText !== null ? safeParseJson(legacyText) : undefined;

    const resolved = parseOrMigrateWorkspace({ v2Raw, legacyV1Raw }, this.factoryOptions);

    if (resolved.source === "migrated-v1") {
      try {
        await this.save(resolved.snapshot);
      } catch {
        const prefix = resolved.warning ? `${resolved.warning} ` : "";
        return {
          ...resolved,
          warning: `${prefix}Migrated legacy tasks, but failed to persist v2 workspace to local storage.`,
        };
      }
    }

    return resolved;
  }

  async save(snapshot: WorkspaceSnapshotV2): Promise<void> {
    if (!this.storage) {
      throw new StorageError("ACCESS_DENIED", "Local storage is unavailable in this environment.");
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(snapshot);
    } catch (error) {
      throw new StorageError(
        "SERIALIZATION_ERROR",
        "Failed to serialize workspace snapshot.",
        error,
      );
    }

    try {
      this.storage.setItem(WORKSPACE_V2_STORAGE_KEY, serialized);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new StorageError(
          "QUOTA_EXCEEDED",
          "Local storage quota exceeded while saving workspace.",
          error,
        );
      }
      if (isSecurityError(error)) {
        throw new StorageError(
          "ACCESS_DENIED",
          "Local storage access denied while saving workspace.",
          error,
        );
      }
      throw new StorageError(
        "UNKNOWN",
        "Unexpected error while saving workspace to local storage.",
        error,
      );
    }
  }

  subscribe(listener: (snapshot: WorkspaceSnapshotV2) => void): () => void {
    if (!this.eventTarget) {
      return () => {};
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_V2_STORAGE_KEY || event.newValue === null) {
        return;
      }

      const parsedJson = safeParseJson(event.newValue);
      if (parsedJson === CORRUPT_JSON_SENTINEL) {
        return;
      }

      const validSnapshot = parseWorkspaceSnapshotV2(parsedJson);
      if (validSnapshot) {
        listener(validSnapshot);
      }
    };

    this.eventTarget.addEventListener("storage", handleStorage);
    return () => {
      this.eventTarget?.removeEventListener("storage", handleStorage);
    };
  }
}
