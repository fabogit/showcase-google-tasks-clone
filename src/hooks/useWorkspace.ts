import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createEmptyWorkspace } from "../domain/schema";
import type { WorkspaceSnapshotV2, WorkspaceState } from "../domain/types";
import {
  createInitialWorkspaceState,
  workspaceReducer,
  type WorkspaceAction,
} from "../domain/workspaceReducer";
import { LocalStorageTaskRepository } from "../storage/LocalStorageTaskRepository";
import { StorageError, type TaskRepository } from "../storage/TaskRepository";

export interface UseWorkspaceResult {
  readonly state: WorkspaceState;
  readonly dispatch: React.Dispatch<WorkspaceAction>;
  readonly isHydrating: boolean;
  readonly storageWarning: string | null;
  readonly dismissStorageWarning: () => void;
}

function formatStorageSaveError(error: unknown): string {
  if (error instanceof StorageError) {
    switch (error.code) {
      case "QUOTA_EXCEEDED":
        return "Storage quota exceeded. Recent changes may not be saved locally.";
      case "ACCESS_DENIED":
        return "Local storage access is blocked. Changes exist only for this session.";
      case "SERIALIZATION_ERROR":
        return "Unable to serialize workspace changes for local storage.";
      case "UNKNOWN":
        return "Failed to save workspace changes to local storage.";
    }
  }
  return "Failed to save workspace changes to local storage.";
}

/**
 * Coordinates the pure workspace reducer with an asynchronous `TaskRepository`.
 * Hydrates initial data, subscribes to cross-tab updates, and persists local changes.
 */
export function useWorkspace(repository?: TaskRepository): UseWorkspaceResult {
  const activeRepository = useMemo(
    () => repository ?? new LocalStorageTaskRepository(),
    [repository],
  );

  const [state, dispatch] = useReducer(workspaceReducer, undefined, () =>
    createInitialWorkspaceState(createEmptyWorkspace()),
  );
  const [hydratedRepository, setHydratedRepository] = useState<TaskRepository | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const isHydrating = hydratedRepository !== activeRepository;
  const skipNextSaveSnapshotRef = useRef<WorkspaceSnapshotV2 | null>(null);

  useEffect(() => {
    let cancelled = false;

    void activeRepository
      .load()
      .then((result) => {
        if (cancelled) {
          return;
        }
        skipNextSaveSnapshotRef.current = result.snapshot;
        dispatch({ type: "HYDRATE", snapshot: result.snapshot });
        setStorageWarning(result.warning ?? null);
        setHydratedRepository(activeRepository);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setStorageWarning("Failed to load saved tasks. Running with a fresh workspace.");
        setHydratedRepository(activeRepository);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository]);

  useEffect(() => {
    return activeRepository.subscribe((remoteSnapshot) => {
      skipNextSaveSnapshotRef.current = remoteSnapshot;
      dispatch({ type: "HYDRATE", snapshot: remoteSnapshot });
    });
  }, [activeRepository]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }
    if (state.snapshot === skipNextSaveSnapshotRef.current) {
      skipNextSaveSnapshotRef.current = null;
      return;
    }

    void activeRepository.save(state.snapshot).catch((error: unknown) => {
      setStorageWarning(formatStorageSaveError(error));
    });
  }, [activeRepository, isHydrating, state.snapshot]);

  const dismissStorageWarning = useCallback(() => {
    setStorageWarning(null);
  }, []);

  return {
    state,
    dispatch,
    isHydrating,
    storageWarning,
    dismissStorageWarning,
  };
}
