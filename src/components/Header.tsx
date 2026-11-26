import type { ReactElement } from "react";
import { isThemePreference, type ThemePreference } from "../hooks/useTheme";
import { CloseIcon, MenuIcon, SearchIcon, TasksLogoIcon } from "./Icons";

interface HeaderProps {
  readonly searchQuery: string;
  readonly onSearchQueryChange: (query: string) => void;
  readonly themePreference: ThemePreference;
  readonly onThemePreferenceChange: (theme: ThemePreference) => void;
  readonly isSidebarOpen: boolean;
  readonly onToggleSidebar: () => void;
}

export function Header({
  searchQuery,
  onSearchQueryChange,
  themePreference,
  onThemePreferenceChange,
  isSidebarOpen,
  onToggleSidebar,
}: HeaderProps): ReactElement {
  return (
    <header className="app-header">
      <div className="header-brand">
        <button
          type="button"
          className="icon-button menu-toggle-button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation drawer"
          aria-expanded={isSidebarOpen}
        >
          <MenuIcon />
        </button>
        <TasksLogoIcon />
        <h1>Tasks</h1>
      </div>

      <div className="header-search-wrap">
        <form
          className="header-search"
          onSubmit={(event) => event.preventDefault()}
          aria-label="Search tasks form"
        >
          <SearchIcon className="header-search-icon" />
          <input
            type="search"
            className="header-search-input"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
          {searchQuery ? (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => onSearchQueryChange("")}
              aria-label="Clear search"
            >
              <CloseIcon size={16} />
            </button>
          ) : null}
        </form>
      </div>

      <div className="header-actions">
        <div className="theme-selector">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            value={themePreference}
            onChange={(event) => {
              const value = event.target.value;
              if (isThemePreference(value)) {
                onThemePreferenceChange(value);
              }
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
    </header>
  );
}
