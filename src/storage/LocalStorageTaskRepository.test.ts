import { describe, expect, it, vi } from "vite-plus/test";
import { createEmptyWorkspace } from "../domain/schema";
import type { WorkspaceSnapshotV2 } from "../domain/types";
import {
  LEGACY_V1_STORAGE_KEY,
  LocalStorageTaskRepository,
  WORKSPACE_V2_STORAGE_KEY,
} from "./LocalStorageTaskRepository";
import { StorageError } from "./TaskRepository";

function createMemoryStorage(initial?: Record<string, string>): Storage {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("LocalStorageTaskRepository", () => {
  it("loads a fresh workspace when storage is empty", async () => {
    const storage = createMemoryStorage();
    const repo = new LocalStorageTaskRepository({
      storage,
      now: () => 100,
      createId: () => "list-1",
    });

    const result = await repo.load();
    expect(result.source).toBe("fresh");
    expect(result.warning).toBeUndefined();
    expect(result.snapshot.lists).toHaveLength(1);
  });

  it("migrates legacy v1 tasks once and persists v2 snapshot", async () => {
    const storage = createMemoryStorage({
      [LEGACY_V1_STORAGE_KEY]: JSON.stringify([
        { id: "legacy-1", text: "Milk", isCompleted: false },
      ]),
    });

    const repo = new LocalStorageTaskRepository({
      storage,
      now: () => 200,
      createId: () => "migrated-list",
    });

    const firstLoad = await repo.load();
    expect(firstLoad.source).toBe("migrated-v1");
    expect(firstLoad.snapshot.tasks).toHaveLength(1);
    expect(firstLoad.snapshot.tasks[0].title).toBe("Milk");
    expect(storage.getItem(WORKSPACE_V2_STORAGE_KEY)).not.toBeNull();

    // Subsequent load uses persisted v2 snapshot directly (idempotent)
    const secondLoad = await repo.load();
    expect(secondLoad.source).toBe("v2");
    expect(secondLoad.snapshot.lists[0].id).toBe("migrated-list");
  });

  it("recovers safely with warning when JSON in storage is corrupted", async () => {
    const storage = createMemoryStorage({
      [WORKSPACE_V2_STORAGE_KEY]: "{not-valid-json",
    });

    const repo = new LocalStorageTaskRepository({
      storage,
      now: () => 300,
      createId: () => "fresh-list",
    });

    const result = await repo.load();
    expect(result.source).toBe("fresh");
    expect(result.warning).toBeTruthy();
  });

  it("falls back to memory-only fresh workspace when storage is unavailable or throws", async () => {
    const nullRepo = new LocalStorageTaskRepository({
      storage: null,
      now: () => 1,
      createId: () => "l1",
    });
    const nullResult = await nullRepo.load();
    expect(nullResult.source).toBe("fresh");
    expect(nullResult.warning).toContain("unavailable");

    const throwingStorage = createMemoryStorage();
    throwingStorage.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    const blockedRepo = new LocalStorageTaskRepository({
      storage: throwingStorage,
      now: () => 1,
      createId: () => "l1",
    });
    const blockedResult = await blockedRepo.load();
    expect(blockedResult.source).toBe("fresh");
    expect(blockedResult.warning).toContain("denied");
  });

  it("maps QuotaExceededError and SecurityError to typed StorageError on save", async () => {
    const snapshot = createEmptyWorkspace({
      now: () => 1,
      createId: () => "l1",
    });

    const quotaStorage = createMemoryStorage();
    quotaStorage.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
    const quotaRepo = new LocalStorageTaskRepository({ storage: quotaStorage });
    await expect(quotaRepo.save(snapshot)).rejects.toMatchObject({
      name: "StorageError",
      code: "QUOTA_EXCEEDED",
    });

    const securityStorage = createMemoryStorage();
    securityStorage.setItem = () => {
      throw new DOMException("Denied", "SecurityError");
    };
    const securityRepo = new LocalStorageTaskRepository({
      storage: securityStorage,
    });
    await expect(securityRepo.save(snapshot)).rejects.toBeInstanceOf(StorageError);
    await expect(securityRepo.save(snapshot)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
  });

  it("notifies subscribers on valid cross-tab storage events and ignores invalid ones", () => {
    const target = new EventTarget();
    const repo = new LocalStorageTaskRepository({
      storage: createMemoryStorage(),
      eventTarget: target as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
    });

    const listener = vi.fn<(snapshot: WorkspaceSnapshotV2) => void>();
    const unsubscribe = repo.subscribe(listener);

    const validSnapshot = createEmptyWorkspace({
      now: () => 500,
      createId: () => "tab-list",
    });

    target.dispatchEvent(
      new StorageEvent("storage", {
        key: "other-key",
        newValue: JSON.stringify(validSnapshot),
      }),
    );
    target.dispatchEvent(
      new StorageEvent("storage", {
        key: WORKSPACE_V2_STORAGE_KEY,
        newValue: "{broken",
      }),
    );
    expect(listener).not.toHaveBeenCalled();

    target.dispatchEvent(
      new StorageEvent("storage", {
        key: WORKSPACE_V2_STORAGE_KEY,
        newValue: JSON.stringify(validSnapshot),
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(validSnapshot);

    unsubscribe();
    target.dispatchEvent(
      new StorageEvent("storage", {
        key: WORKSPACE_V2_STORAGE_KEY,
        newValue: JSON.stringify(validSnapshot),
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
