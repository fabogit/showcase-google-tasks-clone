import { describe, expect, it } from "vite-plus/test";
import {
  createEmptyWorkspace,
  migrateLegacyV1Tasks,
  normalizeTaskPositions,
  parseOrMigrateWorkspace,
  parseWorkspaceSnapshotV2,
} from "./schema";
import { WORKSPACE_SCHEMA_VERSION, type TaskEntity } from "./types";

describe("schema validation and migration", () => {
  it("creates an empty workspace with a single default list", () => {
    const snapshot = createEmptyWorkspace({
      now: () => 1_000,
      createId: () => "list-1",
    });

    expect(snapshot).toEqual({
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      lists: [
        {
          id: "list-1",
          title: "My Tasks",
          sortMode: "manual",
          createdAt: 1_000,
          updatedAt: 1_000,
        },
      ],
      tasks: [],
      updatedAt: 1_000,
    });
  });

  it("rejects malformed v2 roots and empty list arrays", () => {
    expect(parseWorkspaceSnapshotV2(null)).toBeNull();
    expect(parseWorkspaceSnapshotV2("bad")).toBeNull();
    expect(parseWorkspaceSnapshotV2({ schemaVersion: 1, lists: [], tasks: [] })).toBeNull();
    expect(
      parseWorkspaceSnapshotV2({
        schemaVersion: 2,
        lists: [],
        tasks: [],
        updatedAt: 1,
      }),
    ).toBeNull();
  });

  it("enforces 1-level subtask invariants, deduplicates IDs, and normalizes positions", () => {
    const raw = {
      schemaVersion: 2,
      updatedAt: 500,
      lists: [
        {
          id: "l1",
          title: "  Work  ",
          sortMode: "manual",
          createdAt: 10,
          updatedAt: 10,
        },
        {
          id: "l1",
          title: "Duplicate list should be ignored",
          sortMode: "title",
          createdAt: 20,
          updatedAt: 20,
        },
        {
          id: "l2",
          title: "Personal",
          sortMode: "dueDate",
          createdAt: 15,
          updatedAt: 15,
        },
      ],
      tasks: [
        {
          id: "root-1",
          listId: "l1",
          parentId: null,
          title: "Root task",
          notes: "",
          dueDate: "2026-11-30",
          isCompleted: false,
          isStarred: true,
          position: 10,
          createdAt: 100,
          updatedAt: 100,
          completedAt: null,
        },
        {
          id: "child-1",
          listId: "l1",
          parentId: "root-1",
          title: "Valid child",
          notes: "",
          dueDate: null,
          isCompleted: false,
          isStarred: false,
          position: 5,
          createdAt: 101,
          updatedAt: 101,
          completedAt: null,
        },
        {
          id: "grandchild-1",
          listId: "l1",
          parentId: "child-1",
          title: "Too deep -> promoted to root",
          notes: "",
          dueDate: null,
          isCompleted: false,
          isStarred: false,
          position: 2,
          createdAt: 102,
          updatedAt: 102,
          completedAt: null,
        },
        {
          id: "self-parent",
          listId: "l1",
          parentId: "self-parent",
          title: "Self cycle -> promoted to root",
          notes: "",
          dueDate: null,
          isCompleted: true,
          isStarred: false,
          position: 1,
          createdAt: 103,
          updatedAt: 103,
          completedAt: null,
        },
        {
          id: "cross-list-child",
          listId: "l2",
          parentId: "root-1",
          title: "Cross-list parent -> promoted to root",
          notes: "",
          dueDate: null,
          isCompleted: false,
          isStarred: false,
          position: 0,
          createdAt: 104,
          updatedAt: 104,
          completedAt: null,
        },
        {
          id: "invalid-date",
          listId: "l1",
          parentId: null,
          title: "Bad date",
          notes: "",
          dueDate: "2026-02-30",
          isCompleted: false,
          isStarred: false,
          position: 0,
          createdAt: 105,
          updatedAt: 105,
          completedAt: null,
        },
        {
          id: "orphan-list",
          listId: "missing-list",
          parentId: null,
          title: "Missing list",
          notes: "",
          dueDate: null,
          isCompleted: false,
          isStarred: false,
          position: 0,
          createdAt: 106,
          updatedAt: 106,
          completedAt: null,
        },
      ],
    };

    const parsed = parseWorkspaceSnapshotV2(raw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.lists).toHaveLength(2);
    expect(parsed.lists[0].title).toBe("Work");

    expect(parsed.tasks.map((t) => t.id)).toEqual([
      "root-1",
      "child-1",
      "grandchild-1",
      "self-parent",
      "cross-list-child",
    ]);

    const byId = new Map(parsed.tasks.map((t) => [t.id, t]));
    expect(byId.get("child-1")?.parentId).toBe("root-1");
    expect(byId.get("grandchild-1")?.parentId).toBeNull();
    expect(byId.get("self-parent")?.parentId).toBeNull();
    expect(byId.get("self-parent")?.completedAt).toBe(103);
    expect(byId.get("cross-list-child")?.parentId).toBeNull();

    // Dense positions for l1 roots: self-parent(1->0), grandchild-1(2->1), root-1(10->2)
    expect(byId.get("self-parent")?.position).toBe(0);
    expect(byId.get("grandchild-1")?.position).toBe(1);
    expect(byId.get("root-1")?.position).toBe(2);
    expect(byId.get("child-1")?.position).toBe(0);
  });

  it("migrates legacy v1 tasks cleanly and skips invalid entries", () => {
    const legacy = [
      { id: "t1", text: "  Buy bread  ", isCompleted: false },
      { id: "t1", text: "Duplicate", isCompleted: true },
      { id: "t2", text: "   ", isCompleted: false },
      { id: "t3", text: "Call Alex", isCompleted: true },
      "corrupt-entry",
    ];

    const migrated = migrateLegacyV1Tasks(legacy, {
      now: () => 2_000,
      createId: () => "migrated-list",
    });

    expect(migrated).not.toBeNull();
    expect(migrated?.lists[0].id).toBe("migrated-list");
    expect(migrated?.tasks).toHaveLength(2);
    expect(migrated?.tasks[0]).toMatchObject({
      id: "t1",
      listId: "migrated-list",
      title: "Buy bread",
      isCompleted: false,
      completedAt: null,
      position: 0,
    });
    expect(migrated?.tasks[1]).toMatchObject({
      id: "t3",
      title: "Call Alex",
      isCompleted: true,
      completedAt: 2_000,
      position: 1,
    });
  });

  it("resolves workspace with priority v2 > v1 > fresh and emits warnings on recovery", () => {
    const empty = parseOrMigrateWorkspace({}, { now: () => 1, createId: () => "l" });
    expect(empty.source).toBe("fresh");
    expect(empty.warning).toBeUndefined();

    const recoveredFromV1 = parseOrMigrateWorkspace(
      {
        v2Raw: { schemaVersion: 999 },
        legacyV1Raw: [{ id: "1", text: "Legacy", isCompleted: false }],
      },
      { now: () => 1, createId: () => "l" },
    );
    expect(recoveredFromV1.source).toBe("migrated-v1");
    expect(recoveredFromV1.warning).toBeTruthy();

    const corruptedBoth = parseOrMigrateWorkspace(
      { v2Raw: "bad", legacyV1Raw: { notAnArray: true } },
      { now: () => 1, createId: () => "l" },
    );
    expect(corruptedBoth.source).toBe("fresh");
    expect(corruptedBoth.warning).toBeTruthy();
  });

  it("normalizes positions stably using createdAt tie-breaker", () => {
    const tasks: TaskEntity[] = [
      {
        id: "b",
        listId: "l1",
        parentId: null,
        title: "B",
        notes: "",
        dueDate: null,
        isCompleted: false,
        isStarred: false,
        position: 5,
        createdAt: 20,
        updatedAt: 20,
        completedAt: null,
      },
      {
        id: "a",
        listId: "l1",
        parentId: null,
        title: "A",
        notes: "",
        dueDate: null,
        isCompleted: false,
        isStarred: false,
        position: 5,
        createdAt: 10,
        updatedAt: 10,
        completedAt: null,
      },
    ];

    const normalized = normalizeTaskPositions(tasks);
    expect(normalized.find((t) => t.id === "a")?.position).toBe(0);
    expect(normalized.find((t) => t.id === "b")?.position).toBe(1);
  });
});
