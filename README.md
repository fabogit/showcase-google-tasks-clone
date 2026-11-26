# showcase-google-tasks-clone

> A lightweight, accessible task management Single Page Application (Google Tasks clone) engineered with React 19, TypeScript, and Vite, featuring tri-state reactive theme switching and client-side persistence.

**Inception (First Commit):** `2025-04-08` • **Batch / Horizon:** `Batch 2024–2025` • **Architecture Domain:** `Frontend State Management / Productivity Clone`

---

## 📌 Architecture & Overview

`gugol-tasc` is a client-side Single Page Application (SPA) designed to emulate the essential workflows of Google Tasks. Built without heavy UI component frameworks, it demonstrates modern React 19 primitives, strict TypeScript interfaces, custom React hooks, and reactive browser storage synchronization.

* **Context:** Frontend architecture reference and interface clone demonstrating modern React 19 paradigms, unidirectional state lifting, custom hook lifecycle management, and in-place DOM editing without external state management dependencies.
* **Key Patterns:**
  * **Unidirectional State Flow:** Primary task collection and persistence orchestration are isolated in the root `App` component, flowing downward into specialized presentational and interactive children.
  * **Reactive Custom Hook (`useTheme`):** Encapsulated tri-state theme controller (`light` | `dark` | `system`) binding directly to browser media queries (`prefers-color-scheme: dark`) and synchronizing with document root CSS classes.
  * **Isolated Local State Machines:** `TaskItem` encapsulates its own editing lifecycle (`isEditing`, input focus via `useRef`, keyboard listeners for `Enter` and `Escape`, and rollback on empty input).
  * **Defensive Browser Persistence:** Reactive task state serialization into `localStorage` leveraging decoupled `useEffect` storage synchronization.

### Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                         App.tsx                         │
│  - Tasks State (useState<Task[]>)                       │
│  - Theme State via useTheme()                           │
│  - localStorage Synchronization                         │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
                ▼                         ▼
      ┌──────────────────┐      ┌──────────────────┐
      │  AddTaskForm.tsx │      │   TaskList.tsx   │
      │  - Text Input    │      │  - Task Mapping  │
      │  - Submit Handler│      └─────────┬────────┘
      └──────────────────┘                │
                                          ▼
                                ┌──────────────────┐
                                │   TaskItem.tsx   │
                                │  - Completion    │
                                │  - In-Place Edit │
                                │  - Deletion      │
                                └──────────────────┘
```

---

## 🛠 Tech Stack

* **Runtime & Framework:** [React 19](https://react.dev/) (`^19.0.0`), [React DOM](https://react.dev/) (`^19.0.0`)
* **Build Tooling & Bundler:** [Vite 6](https://vite.dev/) (`^6.2.0`), `@vitejs/plugin-react` (`^4.3.4`)
* **Language & Typings:** [TypeScript](https://www.typescriptlang.org/) (`~5.7.2`), `@types/react`, `@types/react-dom`, `@types/uuid`
* **Identification & Helpers:** [UUID v4](https://github.com/uuidjs/uuid) (`^11.1.0`)
* **Package Management:** [pnpm](https://pnpm.io/) (`pnpm-workspace.yaml`, `pnpm-lock.yaml`)
* **Linting & Code Quality:** [ESLint 9](https://eslint.org/) (`^9.21.0`), `typescript-eslint` (`^8.24.1`)
* **Styling & Theming:** Native CSS3 Custom Properties, CSS variables, `prefers-color-scheme` media queries

---

## ✨ Features & Interfaces

* **Task Lifecycle Management (CRUD):**
  * **Creation:** Controlled input form (`AddTaskForm`) with whitespace sanitization and unique UUID assignment.
  * **Read & Display:** Semantic unordered list (`TaskList`) with fallback zero-state placeholder.
  * **Completion Toggle:** Real-time state toggling via custom checkboxes with visual strikethrough feedback.
  * **In-Place Inline Editing:** Double-click or button-activated text modification supporting `Enter` to commit, `Escape` to cancel, and automatic text reversion on empty submissions.
  * **Deletion:** Immediate task removal and state reconciliation.
* **Tri-State Theme Switcher:**
  * Supports explicit **Light**, **Dark**, or **System** preferences.
  * Dynamically observes host OS color-scheme mutations via `window.matchMedia("(prefers-color-scheme: dark)")`.
  * Injects corresponding `.light` or `.dark` class attributes and `color-scheme` properties into `document.documentElement`.
* **Zero-Backend Local Persistence:**
  * Automatic local state hydration and synchronization using the Web Storage API (`localStorage`).

### Data Models & Storage Schema

#### Domain Entity (`src/types/task.ts`)

```typescript
export interface Task {
  id: string;          // Unique identifier generated via uuidv4()
  text: string;        // Descriptive text content of the task
  isCompleted: boolean;// Completion status flag
}
```

#### Browser Storage Keys

| Storage Key | Format | Description |
|---|---|---|
| `gugleTascTasks` | `Task[]` (JSON serialized) | Persisted array containing all active and completed tasks. |
| `themePreference` | `string` (`"light"` \| `"dark"` \| `"system"`) | User-defined theme preference. |

---

## 🚀 Getting Started

### Prerequisites

* **Node.js:** `>= 18.0.0` (LTS recommended)
* **Package Manager:** `pnpm` (`>= 9.x`)

```bash
# Enable pnpm via Corepack if not already installed
corepack enable pnpm
```

### Installation

```bash
# Clone the repository
git clone https://github.com/fabogit/showcase-google-tasks-clone.git
cd showcase-google-tasks-clone

# Install dependencies via pnpm
pnpm install
```

### Running the Application

```bash
# Start Vite local development server with Fast Refresh (HMR)
pnpm dev

# Build the application for production (type-check + Vite build)
pnpm build

# Preview the production build locally
pnpm preview
```

### Code Quality & Linting

```bash
# Run ESLint across the codebase
pnpm lint
```

---

## 📄 License & Author

Developed by [@fabogit](https://github.com/fabogit).
