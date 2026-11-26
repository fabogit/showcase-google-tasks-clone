# showcase-google-tasks-clone

> A Google Tasks clone engineered with React 19.3, TypeScript 7, Vite+ (`vp`), and a Material Design 3 interface, featuring a pure domain reducer, 1-level subtasks, timezone-safe due dates, accessible drag-and-drop reordering, and a pluggable asynchronous `TaskRepository` architecture.

**Inception (First Commit):** `2025-04-08` • **Batch / Horizon:** `2025–2026` • **Architecture Domain:** `Frontend State Management / Productivity Clone`

---

## 📌 Architecture & Overview

`showcase-google-tasks-clone` is a client-side Single Page Application (SPA) reproducing the core Google Tasks workflow without heavy UI component frameworks. Domain logic, runtime schema validation, and persistence contracts are strictly decoupled from React components so the storage backend can be swapped (e.g., from `localStorage` to IndexedDB + `BroadcastChannel` + JSON Import/Export) without rewriting state transitions or UI code.

- **Key Patterns:**
  - **Pure Domain & Reducer Core (`src/domain/`):** `workspaceReducer` enforces list/task invariants (last-list deletion guard, 1-level subtask depth, cascading completion/reopen rules, atomic parent+subtask deletion and cross-list moves, single-step undo snapshots).
  - **Runtime Schema Validation & Automatic Migration (`src/domain/schema.ts`):** Untrusted storage payloads are validated with explicit type guards (zero unsafe `as` casts), and legacy v1 `gugleTascTasks` arrays are automatically migrated on load.
  - **Pluggable Async Persistence (`src/storage/TaskRepository.ts`):** `useWorkspace` coordinates async hydration, typed `StorageError` recovery banners, and cross-tab `storage` synchronization behind an IndexedDB-ready `TaskRepository` interface.
  - **Timezone-Safe Local Calendar Dates (`src/domain/calendarDate.ts`):** Due dates use local `YYYY-MM-DD` strings (`CalendarDate`) rather than UTC timestamps to prevent timezone off-by-one shifts.
  - **Material Design 3 & Anti-FOUC Theming:** Native CSS custom properties in `src/styles/tokens.css` paired with an inline blocking `<head>` script in `index.html` and a hardened `useTheme` hook (`light` | `dark` | `system`).

### Component Hierarchy & Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                │
│  - useTheme()        (light / dark / system + cross-tab sync)        │
│  - useWorkspace()    (workspaceReducer + async TaskRepository)       │
│  - View & Search     (active list, Starred view, global search)      │
└───────┬──────────────────────────┬───────────────────────┬───────────┘
        │                          │                       │
        ▼                          ▼                       ▼
┌────────────────┐      ┌──────────────────────┐   ┌───────────────────┐
│   Header.tsx   │      │     Sidebar.tsx      │   │ UndoSnackbar.tsx  │
│ - Global Search│      │ - Starred Counter    │   │ - <output> live   │
│ - Theme Select │      │ - Lists CRUD & Guard │   │ - Auto-dismiss    │
└────────────────┘      └──────────────────────┘   └───────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────────┐
                │            Task Workspace            │
                ├──────────────────────────────────────┤
                │ - AddTaskForm.tsx  (isolated input)  │
                │ - TaskTreeList.tsx (@dnd-kit + subs) │
                │ - TaskList.tsx     (Starred/Search)  │
                │ - TaskItem.tsx     (TaskDetailsEditor│
                │   notes, CalendarDate, move to list) │
                │ - CompletedSection (collapsible)     │
                └──────────────────────────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────────┐
                │   TaskRepository (async contract)    │
                │   └─ LocalStorageTaskRepository      │
                │      (v1→v2 migration, cross-tab,    │
                │       typed StorageError mapping)    │
                └──────────────────────────────────────┘
```

---

## 🛠 Tech Stack

- **Runtime & UI:** [React](https://react.dev/) (`^19.3.1`), [React DOM](https://react.dev/) (`^19.3.1`)
- **Drag & Drop:** [`@dnd-kit/core`](https://dndkit.com/) (`^6.3.1`), `@dnd-kit/sortable` (`^10.0.0`), `@dnd-kit/utilities` (`^3.2.2`)
- **Unified Toolchain:** [Vite+](https://viteplus.dev/) (`vite-plus@^1.8.0` bundling Vite 8 / Rolldown, Vitest 5, Oxlint, Oxfmt), `@vitejs/plugin-react` (`^6.3.0`)
- **Language & Type Checking:** [TypeScript](https://www.typescriptlang.org/) (`^7.0.2`), `oxlint-tsgolint` (`^7.0.2009`), `@types/react` (`^19.3.2`), `@types/react-dom` (`^19.3.0`)
- **Testing:** Vitest (`vp test`), [`@testing-library/react`](https://testing-library.com/) (`^16.3.3`), `@testing-library/jest-dom` (`^8.0.0`), `@testing-library/user-event` (`^14.6.13`), `@testing-library/dom` (`^10.4.0`), `jsdom` (`^31.0.1`)
- **ID Generation:** Native Web Crypto `createId()` (`src/utils/id.ts`, `crypto.randomUUID()` with RFC 4122 v4 `crypto.getRandomValues()` fallback)
- **Package Manager:** [pnpm](https://pnpm.io/) (`pnpm-workspace.yaml` with Vite+ core/vitest overrides)

---

## ✨ Features & Interfaces

- **Multiple Task Lists:** Create, rename inline, switch, and delete lists (enforcing that at least one list always remains), with active task counter badges.
- **Task Details & Due Dates:** Expandable inline editor (`TaskDetailsEditor`) for title, notes/details preview, `Today` / `Tomorrow` / date-picker / `Clear` controls with overdue/today/tomorrow visual chips, and moving tasks across lists.
- **Starred View:** Toggle star status on any active task, view aggregated active starred tasks with list-origin badges, and create starred tasks directly from the `Starred` view.
- **1-Level Subtasks & Hierarchy Controls:** Inline subtask creation under root tasks, indent and outdent actions with depth guards, and cascading completion/reopening between parent and subtasks.
- **Sorting & Accessible Reordering:** Per-list sorting (`My order`, `Date`, `Title`) plus pointer and keyboard drag-and-drop reordering (`@dnd-kit`) for both root tasks and subtasks.
- **Global Search:** Live case-insensitive search across all lists matching task titles and notes, preserving subtask and list context badges.
- **Completed Section & Undo Snackbar:** Collapsible `Completed (N)` section with single-click restore and `Delete all completed`, paired with an accessible `<output>` Undo Snackbar for deletions, completions, list removals, and bulk clears.
- **Extensibility Roadmap:** The async `TaskRepository` interface and `parseWorkspaceSnapshotV2` runtime validator allow drop-in future support for an `IndexedDbTaskRepository`, `BroadcastChannel` multi-tab sync, validated JSON Import/Export, and optional offline PWA caching.

### ⌨️ Keyboard Shortcuts

| Context                                     | Shortcut                            | Action                                                  |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| Active root task row                        | `Ctrl + ]` / `Cmd + ]`              | Indent task into a subtask under the previous root task |
| Active subtask row                          | `Ctrl + [` / `Cmd + [`              | Promote subtask back to top-level task                  |
| Inline editors (lists / details / subtasks) | `Enter` / `Escape`                  | Commit changes / cancel editing                         |
| Reorder drag handle                         | `Space` then `↑` / `↓` then `Space` | Pick up, move, and drop task or subtask                 |

### Data Models & Storage Schema

#### Core Entities (`src/domain/types.ts`)

```typescript
export type CalendarDate = `${number}-${string}-${string}`; // Local YYYY-MM-DD
export type SortMode = "manual" | "dueDate" | "title";

export interface TaskListEntity {
  readonly id: string;
  readonly title: string;
  readonly sortMode: SortMode;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TaskEntity {
  readonly id: string;
  readonly listId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly notes: string;
  readonly dueDate: CalendarDate | null;
  readonly isCompleted: boolean;
  readonly isStarred: boolean;
  readonly position: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly completedAt: number | null;
}

export interface WorkspaceSnapshotV2 {
  readonly schemaVersion: 2;
  readonly lists: readonly TaskListEntity[];
  readonly tasks: readonly TaskEntity[];
  readonly updatedAt: number;
}
```

#### Browser Storage Keys

| Storage Key                     | Format                              | Description                                                       |
| ------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `googleTasksClone.workspace.v2` | `WorkspaceSnapshotV2` (JSON)        | Validated v2 lists and tasks workspace.                           |
| `gugleTascTasks`                | `LegacyTaskV1[]` (JSON)             | Legacy v1 task array, automatically migrated to v2 on first load. |
| `themePreference`               | `"light"` \| `"dark"` \| `"system"` | User theme preference synced across tabs and OS preferences.      |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `>= 22.18.0` (`^22.18.0 || ^24.11.0 || >=26.0.0`)
- **Package Manager:** `pnpm` (`>= 11.x`)

```bash
corepack enable pnpm
```

### Installation

```bash
git clone https://github.com/fabogit/showcase-google-tasks-clone.git
cd showcase-google-tasks-clone
pnpm install
```

### Development, Quality Checks & Build

```bash
# Start Vite+ local development server
pnpm dev

# Format, lint (Oxlint type-aware + jsx-a11y), and typecheck via Vite+
pnpm check

# Run formatting or linting individually
pnpm fmt
pnpm lint

# Run standalone TypeScript 7 project check
pnpm typecheck

# Run unit and integration test suites (Vitest)
pnpm test
pnpm test:watch

# Build production bundle to dist/ and preview locally
pnpm build
pnpm preview
```

---

## 📄 License & Author

Developed by [@fabogit](https://github.com/fabogit).
