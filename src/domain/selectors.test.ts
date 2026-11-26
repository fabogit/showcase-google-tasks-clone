import { describe, expect, it } from "vite-plus/test";
import {
  selectActiveTaskCount,
  selectGlobalSearchResults,
  selectListTaskGroups,
  selectStarredTasks,
} from "./selectors";
import type { TaskEntity, TaskListEntity } from "./types";

const LIST_1: TaskListEntity = {
  id: "l1",
  title: "Personal",
  sortMode: "manual",
  createdAt: 1,
  updatedAt: 1,
};

const LIST_2: TaskListEntity = {
  id: "l2",
  title: "Work",
  sortMode: "dueDate",
  createdAt: 1,
  updatedAt: 1,
};

const SAMPLE_TASKS: readonly TaskEntity[] = [
  {
    id: "t1",
    listId: "l1",
    parentId: null,
    title: "Zebra task",
    notes: "buy apples",
    dueDate: "2026-11-29",
    isCompleted: false,
    isStarred: true,
    position: 0,
    createdAt: 10,
    updatedAt: 10,
    completedAt: null,
  },
  {
    id: "t1-sub",
    listId: "l1",
    parentId: "t1",
    title: "Subtask beta",
    notes: "",
    dueDate: null,
    isCompleted: false,
    isStarred: false,
    position: 0,
    createdAt: 11,
    updatedAt: 11,
    completedAt: null,
  },
  {
    id: "t2",
    listId: "l1",
    parentId: null,
    title: "Alpha task",
    notes: "",
    dueDate: "2026-11-27",
    isCompleted: false,
    isStarred: false,
    position: 1,
    createdAt: 12,
    updatedAt: 12,
    completedAt: null,
  },
  {
    id: "t3",
    listId: "l1",
    parentId: null,
    title: "Done task",
    notes: "",
    dueDate: null,
    isCompleted: true,
    isStarred: true,
    position: 2,
    createdAt: 13,
    updatedAt: 13,
    completedAt: 50,
  },
  {
    id: "w1",
    listId: "l2",
    parentId: null,
    title: "No date work",
    notes: "",
    dueDate: null,
    isCompleted: false,
    isStarred: true,
    position: 0,
    createdAt: 14,
    updatedAt: 20,
    completedAt: null,
  },
  {
    id: "w2",
    listId: "l2",
    parentId: null,
    title: "Urgent work",
    notes: "apples invoice",
    dueDate: "2026-11-26",
    isCompleted: false,
    isStarred: true,
    position: 1,
    createdAt: 15,
    updatedAt: 25,
    completedAt: null,
  },
];

describe("selectors", () => {
  it("counts active tasks per list excluding completed tasks", () => {
    expect(selectActiveTaskCount(SAMPLE_TASKS, "l1")).toBe(3);
    expect(selectActiveTaskCount(SAMPLE_TASKS, "l2")).toBe(2);
  });

  it("selects active starred tasks sorted by dueDate then updatedAt", () => {
    const starred = selectStarredTasks(SAMPLE_TASKS);
    expect(starred.map((t) => t.id)).toEqual(["w2", "t1", "w1"]);
  });

  it("groups and sorts list tasks by manual, dueDate, and title modes", () => {
    const manual = selectListTaskGroups(SAMPLE_TASKS, LIST_1);
    expect(manual.activeItems.map((i) => i.task.id)).toEqual(["t1", "t2"]);
    expect(manual.activeItems[0].subtasks.map((s) => s.id)).toEqual(["t1-sub"]);
    expect(manual.completedTasks.map((t) => t.id)).toEqual(["t3"]);
    expect(manual.activeCount).toBe(3);
    expect(manual.completedCount).toBe(1);

    const byDueDate = selectListTaskGroups(SAMPLE_TASKS, {
      ...LIST_1,
      sortMode: "dueDate",
    });
    expect(byDueDate.activeItems.map((i) => i.task.id)).toEqual(["t2", "t1"]);

    const byTitle = selectListTaskGroups(SAMPLE_TASKS, {
      ...LIST_1,
      sortMode: "title",
    });
    expect(byTitle.activeItems.map((i) => i.task.id)).toEqual(["t2", "t1"]);

    const workByDue = selectListTaskGroups(SAMPLE_TASKS, LIST_2);
    expect(workByDue.activeItems.map((i) => i.task.id)).toEqual(["w2", "w1"]);
  });

  it("filters list tasks preserving parent context for matching subtasks", () => {
    const subMatch = selectListTaskGroups(SAMPLE_TASKS, LIST_1, "beta");
    expect(subMatch.activeItems).toHaveLength(1);
    expect(subMatch.activeItems[0].task.id).toBe("t1");
    expect(subMatch.activeItems[0].subtasks.map((s) => s.id)).toEqual(["t1-sub"]);
  });

  it("searches globally across all lists with list titles", () => {
    const results = selectGlobalSearchResults(SAMPLE_TASKS, [LIST_1, LIST_2], "APPLES");
    expect(results).toEqual([
      { task: SAMPLE_TASKS[5], listTitle: "Work" },
      { task: SAMPLE_TASKS[0], listTitle: "Personal" },
    ]);
    expect(selectGlobalSearchResults(SAMPLE_TASKS, [LIST_1], "   ")).toEqual([]);
  });
});
