import { useMemo, useState, type ReactElement } from "react";
import AddTaskForm from "./components/AddTaskForm";
import { Header } from "./components/Header";
import { AlertIcon, CloseIcon } from "./components/Icons";
import { Sidebar, type SidebarActiveView } from "./components/Sidebar";
import TaskList from "./components/TaskList";
import {
  selectGlobalSearchResults,
  selectListTaskGroups,
  selectStarredTasks,
} from "./domain/selectors";
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

  const activeListTasks = useMemo(() => {
    const items = listGroups.activeItems.flatMap((item) => [item.task, ...item.subtasks]);
    return [...items, ...listGroups.completedTasks];
  }, [listGroups]);

  const handleCreateList = (title: string) => {
    const id = createId();
    dispatch({ type: "ADD_LIST", id, title, now: Date.now() });
    setSelectedView({ kind: "list", listId: id });
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

  const handleToggleComplete = (taskId: string) => {
    dispatch({
      type: "TOGGLE_TASK_COMPLETED",
      taskId,
      now: Date.now(),
      undoId: createId(),
    });
  };

  const handleEditTask = (taskId: string, newTitle: string) => {
    dispatch({
      type: "UPDATE_TASK",
      taskId,
      patch: { title: newTitle },
      now: Date.now(),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    dispatch({
      type: "DELETE_TASK",
      taskId,
      now: Date.now(),
      undoId: createId(),
    });
  };

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
              listTitleById={listTitleById}
              onToggleComplete={handleToggleComplete}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
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
          {starredTasks.length === 0 ? (
            <p className="empty-state">No starred tasks yet.</p>
          ) : (
            <TaskList
              tasks={starredTasks}
              listTitleById={listTitleById}
              onToggleComplete={handleToggleComplete}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
            />
          )}
        </>
      );
    }

    return (
      <>
        <div className="tasks-card-header">
          <h2>{activeList.title}</h2>
          <span className="tasks-card-subtitle">{listGroups.activeCount} active</span>
        </div>

        <AddTaskForm onAddTask={handleAddTask} />

        {activeListTasks.length === 0 ? (
          <p className="empty-state">No tasks yet. Add one!</p>
        ) : (
          <TaskList
            tasks={activeListTasks}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
          />
        )}
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
          onSelectView={setSelectedView}
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
    </div>
  );
}

export default App;
