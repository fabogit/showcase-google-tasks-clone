import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { selectActiveTaskCount, selectStarredTasks } from "../domain/selectors";
import type { TaskEntity, TaskListEntity } from "../domain/types";
import { EditIcon, ListIcon, PlusIcon, StarIcon, TrashIcon } from "./Icons";

export type SidebarActiveView =
  | { readonly kind: "list"; readonly listId: string }
  | { readonly kind: "starred" };

interface SidebarProps {
  readonly lists: readonly TaskListEntity[];
  readonly tasks: readonly TaskEntity[];
  readonly activeView: SidebarActiveView;
  readonly isOpen: boolean;
  readonly onSelectView: (view: SidebarActiveView) => void;
  readonly onCreateList: (title: string) => void;
  readonly onRenameList: (listId: string, title: string) => void;
  readonly onDeleteList: (listId: string) => void;
  readonly onCloseMobile: () => void;
}

export function Sidebar({
  lists,
  tasks,
  activeView,
  isOpen,
  onSelectView,
  onCreateList,
  onRenameList,
  onDeleteList,
  onCloseMobile,
}: SidebarProps): ReactElement {
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingList) {
      createInputRef.current?.focus();
    }
  }, [isCreatingList]);

  useEffect(() => {
    if (renamingListId !== null) {
      renameInputRef.current?.focus();
    }
  }, [renamingListId]);

  const starredCount = selectStarredTasks(tasks).length;
  const canDeleteList = lists.length > 1;

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newListTitle.trim();
    if (!trimmed) {
      return;
    }
    onCreateList(trimmed);
    setNewListTitle("");
    setIsCreatingList(false);
  };

  const handleCreateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setNewListTitle("");
      setIsCreatingList(false);
    }
  };

  const startRenaming = (list: TaskListEntity) => {
    setRenamingListId(list.id);
    setRenameTitle(list.title);
  };

  const cancelRenaming = () => {
    setRenamingListId(null);
    setRenameTitle("");
  };

  const commitRename = (event: FormEvent) => {
    event.preventDefault();
    if (renamingListId === null) {
      return;
    }
    const trimmed = renameTitle.trim();
    if (trimmed) {
      onRenameList(renamingListId, trimmed);
    }
    cancelRenaming();
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      cancelRenaming();
    }
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="sidebar-scrim open"
          onClick={onCloseMobile}
          aria-label="Close navigation drawer"
        />
      ) : null}

      <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
        <nav className="sidebar-nav" aria-label="Task lists">
          <button
            type="button"
            className={`sidebar-nav-item ${activeView.kind === "starred" ? "active" : ""}`}
            aria-current={activeView.kind === "starred" ? "page" : undefined}
            onClick={() => {
              onSelectView({ kind: "starred" });
              onCloseMobile();
            }}
          >
            <StarIcon filled={activeView.kind === "starred"} />
            <span className="sidebar-item-label">Starred</span>
            <span className="sidebar-count">{starredCount}</span>
          </button>

          <div className="sidebar-section-header">
            <span>Lists</span>
          </div>

          {lists.map((list) => {
            const isSelected = activeView.kind === "list" && activeView.listId === list.id;
            const activeCount = selectActiveTaskCount(tasks, list.id);

            if (renamingListId === list.id) {
              return (
                <form
                  key={list.id}
                  onSubmit={commitRename}
                  className="sidebar-inline-form"
                  aria-label={`Rename list "${list.title}"`}
                >
                  <input
                    ref={renameInputRef}
                    type="text"
                    className="sidebar-inline-input"
                    value={renameTitle}
                    onChange={(event) => setRenameTitle(event.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    aria-label="List name"
                  />
                  <div className="sidebar-inline-actions">
                    <button type="button" className="btn-text" onClick={cancelRenaming}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={list.id} className="sidebar-list-row">
                <button
                  type="button"
                  className={`sidebar-nav-item ${isSelected ? "active" : ""}`}
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => {
                    onSelectView({ kind: "list", listId: list.id });
                    onCloseMobile();
                  }}
                >
                  <ListIcon />
                  <span className="sidebar-item-label">{list.title}</span>
                  <span className="sidebar-count">{activeCount}</span>
                </button>

                <div className="sidebar-list-actions">
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={() => startRenaming(list)}
                    aria-label={`Rename list "${list.title}"`}
                    title="Rename list"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={() => onDeleteList(list.id)}
                    disabled={!canDeleteList}
                    aria-label={`Delete list "${list.title}"`}
                    title={canDeleteList ? "Delete list" : "At least one list is required"}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}

          {isCreatingList ? (
            <form
              onSubmit={handleCreateSubmit}
              className="sidebar-inline-form"
              aria-label="Create new list form"
            >
              <input
                ref={createInputRef}
                type="text"
                className="sidebar-inline-input"
                placeholder="Enter list name..."
                value={newListTitle}
                onChange={(event) => setNewListTitle(event.target.value)}
                onKeyDown={handleCreateKeyDown}
                aria-label="New list name"
              />
              <div className="sidebar-inline-actions">
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => {
                    setNewListTitle("");
                    setIsCreatingList(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn-text sidebar-create-trigger"
              onClick={() => setIsCreatingList(true)}
            >
              <PlusIcon />
              <span>Create new list</span>
            </button>
          )}
        </nav>
      </aside>
    </>
  );
}
