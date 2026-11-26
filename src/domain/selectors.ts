import { compareCalendarDates } from "./calendarDate";
import type { SortMode, TaskEntity, TaskListEntity } from "./types";

export interface TaskTreeItem {
  readonly task: TaskEntity;
  readonly subtasks: readonly TaskEntity[];
}

export interface ListTaskGroups {
  readonly activeItems: readonly TaskTreeItem[];
  readonly completedTasks: readonly TaskEntity[];
  readonly activeCount: number;
  readonly completedCount: number;
}

export interface SearchTaskResult {
  readonly task: TaskEntity;
  readonly listTitle: string;
}

function matchesSearchQuery(task: TaskEntity, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }
  return (
    task.title.toLowerCase().includes(normalizedQuery) ||
    task.notes.toLowerCase().includes(normalizedQuery)
  );
}

function compareRootTasks(a: TaskEntity, b: TaskEntity, sortMode: SortMode): number {
  switch (sortMode) {
    case "manual":
      return a.position - b.position;

    case "dueDate": {
      if (a.dueDate && b.dueDate) {
        const cmp = compareCalendarDates(a.dueDate, b.dueDate);
        if (cmp !== 0) return cmp;
      } else if (a.dueDate && !b.dueDate) {
        return -1;
      } else if (!a.dueDate && b.dueDate) {
        return 1;
      }
      return a.position - b.position;
    }

    case "title": {
      const cmp = a.title.localeCompare(b.title, undefined, {
        sensitivity: "base",
      });
      if (cmp !== 0) return cmp;
      return a.position - b.position;
    }
  }
}

export function selectActiveTaskCount(tasks: readonly TaskEntity[], listId: string): number {
  let count = 0;
  for (const task of tasks) {
    if (task.listId === listId && !task.isCompleted) {
      count += 1;
    }
  }
  return count;
}

export function selectStarredTasks(tasks: readonly TaskEntity[]): TaskEntity[] {
  return tasks
    .filter((task) => !task.isCompleted && task.isStarred)
    .slice()
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const cmp = compareCalendarDates(a.dueDate, b.dueDate);
        if (cmp !== 0) return cmp;
      } else if (a.dueDate && !b.dueDate) {
        return -1;
      } else if (!a.dueDate && b.dueDate) {
        return 1;
      }
      return b.updatedAt - a.updatedAt;
    });
}

export function selectListTaskGroups(
  tasks: readonly TaskEntity[],
  list: TaskListEntity,
  searchQuery = "",
): ListTaskGroups {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const listTasks = tasks.filter((task) => task.listId === list.id);

  const activeRoots: TaskEntity[] = [];
  const activeSubtasksByParent = new Map<string, TaskEntity[]>();
  const completedTasks: TaskEntity[] = [];

  for (const task of listTasks) {
    if (task.isCompleted) {
      completedTasks.push(task);
      continue;
    }

    if (task.parentId === null) {
      activeRoots.push(task);
    } else {
      const siblings = activeSubtasksByParent.get(task.parentId);
      if (siblings) {
        siblings.push(task);
      } else {
        activeSubtasksByParent.set(task.parentId, [task]);
      }
    }
  }

  activeRoots.sort((a, b) => compareRootTasks(a, b, list.sortMode));

  const activeItems: TaskTreeItem[] = [];
  for (const root of activeRoots) {
    const subtasks = (activeSubtasksByParent.get(root.id) ?? [])
      .slice()
      .sort((a, b) => a.position - b.position);

    if (!normalizedQuery) {
      activeItems.push({ task: root, subtasks });
      continue;
    }

    if (matchesSearchQuery(root, normalizedQuery)) {
      activeItems.push({ task: root, subtasks });
    } else {
      const matchingSubtasks = subtasks.filter((subtask) =>
        matchesSearchQuery(subtask, normalizedQuery),
      );
      if (matchingSubtasks.length > 0) {
        activeItems.push({ task: root, subtasks: matchingSubtasks });
      }
    }
  }

  const filteredCompleted = completedTasks
    .filter((task) => matchesSearchQuery(task, normalizedQuery))
    .slice()
    .sort((a, b) => {
      const aTime = a.completedAt ?? a.updatedAt;
      const bTime = b.completedAt ?? b.updatedAt;
      return bTime - aTime;
    });

  let activeCount = 0;
  for (const item of activeItems) {
    activeCount += 1 + item.subtasks.length;
  }

  return {
    activeItems,
    completedTasks: filteredCompleted,
    activeCount,
    completedCount: filteredCompleted.length,
  };
}

export function selectGlobalSearchResults(
  tasks: readonly TaskEntity[],
  lists: readonly TaskListEntity[],
  query: string,
): SearchTaskResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const listTitleById = new Map<string, string>();
  for (const list of lists) {
    listTitleById.set(list.id, list.title);
  }

  return tasks
    .filter((task) => matchesSearchQuery(task, normalizedQuery))
    .slice()
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return b.updatedAt - a.updatedAt;
    })
    .map((task) => ({
      task,
      listTitle: listTitleById.get(task.listId) ?? "Tasks",
    }));
}
