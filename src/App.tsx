import { useCallback, useMemo, useState, type ReactElement } from "react";
import AddTaskForm from "./components/AddTaskForm";
import { CompletedSection } from "./components/CompletedSection";
import { Header } from "./components/Header";
import { AlertIcon, CloseIcon, SortIcon } from "./components/Icons";
import { Sidebar, type SidebarActiveView } from "./components/Sidebar";
import type { TaskUpdatePatch } from "./components/TaskItem";
import TaskList from "./components/TaskList";
import { TaskTreeList } from "./components/TaskTreeList";
import { UndoSnackbar } from "./components/UndoSnackbar";
import { isSortMode } from "./domain/schema";
import {
  selectGlobalSearchResults,
  selectListTaskGroups,
  selectStarredTasks,
} from "./domain/selectors";
import type { SortMode } from "./domain/types";
import { useTheme } from "./hooks/useTheme";
import { useWorkspace } from "./hooks/useWorkspace";
import type { TaskRepository } from "./storage/TaskRepository";
import { createId } from "./utils/id";
import "./App.css";

export type ActiveView = SidebarActiveView;

interface AppProps {
  readonly repository?: TaskRepository;
}

function App({ repository }: AppProps): ReactElement {
  const [themePreference, setThemePreference] = useTheme();
  const { state, dispatch, isHydrating, storageWarning, dismissStorageWarning } =
    useWorkspace(repository);

  const [selectedView, setSelectedView] = useState<ActiveView | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const { lists, tasks } = state.snapshot;

  const activeView: ActiveView = useMemo(() => {
    if (selectedView?.kind === "starred") {
      return selectedView;
    }
    if (selectedView?.kind === "list" && lists.some((list) => list.id === selectedView.listId)) {
      return selectedView;
    }
    return { kind: "list", listId: lists[0].id };
  }, [lists, selectedView]);

  const activeList = useMemo(() => {
    if (activeView.kind !== "list") {
      return lists[0];
    }
    return lists.find((list) => list.id === activeView.listId) ?? lists[0];
  }, [activeView, lists]);

  const listTitleById = useMemo(() => new Map(lists.map((list) => [list.id, list.title])), [lists]);

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const globalSearchResults = useMemo(
    () => (isSearching ? selectGlobalSearchResults(tasks, lists, trimmedSearch) : []),
    [isSearching, lists, tasks, trimmedSearch],
  );

  const starredTasks = useMemo(
    () => (activeView.kind === "starred" ? selectStarredTasks(tasks) : []),
    [activeView.kind, tasks],
  );

  const listGroups = useMemo(() => selectListTaskGroups(tasks, activeList), [activeList, tasks]);

  const handleSelectView = (view: ActiveView) => {
    setSelectedView(view);
    setExpandedTaskId(null);
  };

  const handleCreateList = (title: string) => {
    const id = createId();
    dispatch({ type: "ADD_LIST", id, title, now: Date.now() });
    setSelectedView({ kind: "list", listId: id });
    setExpandedTaskId(null);
  };

  const handleRenameList = (listId: string, title: string) => {
    dispatch({ type: "RENAME_LIST", listId, title, now: Date.now() });
  };

  const handleDeleteList = (listId: string) => {
    dispatch({
      type: "DELETE_LIST",
      listId,
      now: Date.now(),
      undoId: createId(),
    });
    setExpandedTaskId(null);
  };

  const handleAddTask = (title: string) => {
    dispatch({
      type: "ADD_TASK",
      id: createId(),
      listId: activeList.id,
      title,
      now: Date.now(),
    });
  };

  const handleAddStarredTask = (title: string) => {
    dispatch({
      type: "ADD_TASK",
      id: createId(),
      listId: lists[0].id,
      title,
      isStarred: true,
      now: Date.now(),
    });
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleToggleComplete = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }
    dispatch({
      type: "TOGGLE_TASK_COMPLETED",
      taskId,
      now: Date.now(),
      undoId: createId(),
    });
  };

  const handleToggleStarred = (taskId: string) => {
    dispatch({
      type: "TOGGLE_TASK_STARRED",
      taskId,
      now: Date.now(),
    });
  };

  const handleUpdateTask = (taskId: string, patch: TaskUpdatePatch) => {
    dispatch({
      type: "UPDATE_TASK",
      taskId,
      patch,
      now: Date.now(),
    });
  };

  const handleMoveTaskToList = (taskId: string, targetListId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }
    dispatch({
      type: "MOVE_TASK_TO_LIST",
      taskId,
      targetListId,
      now: Date.now(),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }
    dispatch({
      type: "DELETE_TASK",
      taskId,
      now: Date.now(),
      undoId: createId(),
    });
  };

  const handleClearCompleted = () => {
    dispatch({
      type: "CLEAR_COMPLETED_TASKS",
      listId: activeList.id,
      now: Date.now(),
      undoId: createId(),
    });
  };

  const handleSetSortMode = (sortMode: SortMode) => {
    dispatch({
      type: "SET_LIST_SORT_MODE",
      listId: activeList.id,
      sortMode,
      now: Date.now(),
    });
  };

  const handleAddSubtask = (parentId: string, title: string) => {
    dispatch({
      type: "ADD_TASK",
      id: createId(),
      listId: activeList.id,
      parentId,
      title,
      now: Date.now(),
    });
  };

  const handleIndentTask = (taskId: string, targetParentId: string) => {
    dispatch({
      type: "INDENT_TASK",
      taskId,
      targetParentId,
      now: Date.now(),
    });
  };

  const handleOutdentTask = (taskId: string) => {
    dispatch({
      type: "OUTDENT_TASK",
      taskId,
      now: Date.now(),
    });
  };

  const handleReorderTasks = (parentId: string | null, orderedTaskIds: readonly string[]) => {
    dispatch({
      type: "REORDER_TASKS",
      listId: activeList.id,
      parentId,
      orderedTaskIds,
      now: Date.now(),
    });
  };

  const handleUndo = useCallback(() => {
    setExpandedTaskId(null);
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const handleDismissUndo = useCallback(() => {
    dispatch({ type: "DISMISS_UNDO" });
  }, [dispatch]);

  const renderMainContent = (): ReactElement => {
    if (isHydrating) {
      return <p className="empty-state">Loading tasks...</p>;
    }

    if (isSearching) {
      return (
        <>
          <div className="tasks-card-header">
            <h2>Search results</h2>
            <span className="tasks-card-subtitle">
              {globalSearchResults.length} match
              {globalSearchResults.length === 1 ? "" : "es"}
            </span>
          </div>
          {globalSearchResults.length === 0 ? (
            <p className="empty-state">No matching tasks found.</p>
          ) : (
            <TaskList
              tasks={globalSearchResults.map((entry) => entry.task)}
              lists={lists}
              listTitleById={listTitleById}
              expandedTaskId={expandedTaskId}
              onToggleExpand={handleToggleExpand}
              onToggleComplete={handleToggleComplete}
              onToggleStarred={handleToggleStarred}
              onUpdateTask={handleUpdateTask}
              onMoveTaskToList={handleMoveTaskToList}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </>
      );
    }

    if (activeView.kind === "starred") {
      return (
        <>
          <div className="tasks-card-header">
            <h2>Starred</h2>
            <span className="tasks-card-subtitle">{starredTasks.length} active</span>
          </div>

          <AddTaskForm onAddTask={handleAddStarredTask} placeholder="Add a starred task..." />

          {starredTasks.length === 0 ? (
            <p className="empty-state">No starred tasks yet.</p>
          ) : (
            <TaskList
              tasks={starredTasks}
              lists={lists}
              listTitleById={listTitleById}
              expandedTaskId={expandedTaskId}
              onToggleExpand={handleToggleExpand}
              onToggleComplete={handleToggleComplete}
              onToggleStarred={handleToggleStarred}
              onUpdateTask={handleUpdateTask}
              onMoveTaskToList={handleMoveTaskToList}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </>
      );
    }

    return (
      <>
        <div className="tasks-card-header">
          <div className="tasks-card-header-meta">
            <h2>{activeList.title}</h2>
            <span className="tasks-card-subtitle">{listGroups.activeCount} active</span>
          </div>

          <div className="sort-control">
            <SortIcon />
            <label htmlFor="list-sort-select">Sort by</label>
            <select
              id="list-sort-select"
              aria-label="Sort tasks by"
              value={activeList.sortMode}
              onChange={(event) => {
                const value = event.target.value;
                if (isSortMode(value)) {
                  handleSetSortMode(value);
                }
              }}
            >
              <option value="manual">My order</option>
              <option value="dueDate">Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <AddTaskForm onAddTask={handleAddTask} />

        {listGroups.activeItems.length === 0 && listGroups.completedCount === 0 ? (
          <p className="empty-state">No tasks yet. Add one!</p>
        ) : listGroups.activeItems.length === 0 ? (
          <p className="empty-state">All tasks completed!</p>
        ) : (
          <TaskTreeList
            items={listGroups.activeItems}
            lists={lists}
            expandedTaskId={expandedTaskId}
            onToggleExpand={handleToggleExpand}
            onToggleComplete={handleToggleComplete}
            onToggleStarred={handleToggleStarred}
            onUpdateTask={handleUpdateTask}
            onMoveTaskToList={handleMoveTaskToList}
            onDeleteTask={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            onIndentTask={handleIndentTask}
            onOutdentTask={handleOutdentTask}
            onReorderTasks={handleReorderTasks}
          />
        )}

        <CompletedSection
          completedTasks={listGroups.completedTasks}
          lists={lists}
          onToggleComplete={handleToggleComplete}
          onDeleteTask={handleDeleteTask}
          onClearCompleted={handleClearCompleted}
        />
      </>
    );
  };

  return (
    <div className="app-shell">
      <Header
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        themePreference={themePreference}
        onThemePreferenceChange={setThemePreference}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="workspace-body">
        <Sidebar
          lists={lists}
          tasks={tasks}
          activeView={activeView}
          isOpen={isSidebarOpen}
          onSelectView={handleSelectView}
          onCreateList={handleCreateList}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <main className="app-main">
          {storageWarning ? (
            <div className="storage-banner" role="alert">
              <AlertIcon />
              <span className="storage-banner-text">{storageWarning}</span>
              <button
                type="button"
                className="icon-button icon-button-sm"
                onClick={dismissStorageWarning}
                aria-label="Dismiss storage warning"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ) : null}

          <section className="tasks-card" aria-label="Tasks workspace">
            {renderMainContent()}
          </section>
        </main>
      </div>

      <UndoSnackbar undoEntry={state.undoEntry} onUndo={handleUndo} onDismiss={handleDismissUndo} />
    </div>
  );
}

export default App;
