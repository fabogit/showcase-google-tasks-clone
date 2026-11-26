import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";
import App from "./App";
import { WORKSPACE_SCHEMA_VERSION } from "./domain/types";
import {
  LEGACY_V1_STORAGE_KEY,
  LocalStorageTaskRepository,
  WORKSPACE_V2_STORAGE_KEY,
} from "./storage/LocalStorageTaskRepository";

describe("App Google Tasks core workflows", () => {
  it("supports adding, expanding details, updating notes/due dates, and deleting with undo", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    expect(await screen.findByText("No tasks yet. Add one!")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New task text"), "Buy milk");
    await user.click(screen.getByRole("button", { name: "Add Task" }));
    expect(screen.getByText("Buy milk")).toBeInTheDocument();

    // Expand details editor
    await user.click(screen.getByRole("button", { name: 'Edit task "Buy milk"' }));
    const titleInput = screen.getByLabelText('Edit title for "Buy milk"');
    await user.clear(titleInput);
    await user.type(titleInput, "Buy oat milk");
    await user.type(screen.getByLabelText("Task notes"), "Unsweetened carton");
    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
    expect(screen.getByText("Unsweetened carton")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();

    // Clear due date from expanded editor
    await user.click(screen.getByRole("button", { name: 'Edit task "Buy oat milk"' }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Today")).not.toBeInTheDocument();

    // Delete and restore via Undo Snackbar
    await user.click(screen.getByRole("button", { name: 'Delete task "Buy oat milk"' }));
    expect(screen.queryByText("Buy oat milk")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Task deleted");

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
  });

  it("moves tasks between lists and manages Starred view", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    // Create second list
    await user.click(screen.getByRole("button", { name: "Create new list" }));
    await user.type(screen.getByLabelText("New list name"), "Work{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "Work" })).toBeInTheDocument();

    // Add task to Work, star it, and move it to My Tasks
    await user.type(screen.getByLabelText("New task text"), "Quarterly report");
    await user.click(screen.getByRole("button", { name: "Add Task" }));
    await user.click(screen.getByRole("button", { name: 'Star task "Quarterly report"' }));

    await user.click(screen.getByRole("button", { name: 'Edit task "Quarterly report"' }));
    const moveSelect = screen.getByLabelText("Move to list");
    const myTasksOption = within(moveSelect).getByRole("option", {
      name: "My Tasks",
    }) as HTMLOptionElement;
    await user.selectOptions(moveSelect, myTasksOption.value);
    expect(screen.queryByText("Quarterly report")).not.toBeInTheDocument();

    // Verify it appears in Starred with My Tasks badge, and add another starred task
    const nav = screen.getByRole("navigation", { name: "Task lists" });
    await user.click(within(nav).getByRole("button", { name: /Starred/ }));

    expect(screen.getByRole("heading", { level: 2, name: "Starred" })).toBeInTheDocument();
    expect(screen.getByText("Quarterly report")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New task text"), "Urgent call");
    await user.click(screen.getByRole("button", { name: "Add Task" }));
    expect(screen.getByText("Urgent call")).toBeInTheDocument();
  });

  it("moves completed tasks to collapsible Completed section and supports clear + undo", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    await user.type(screen.getByLabelText("New task text"), "Submit PR");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Submit PR" as complete' }));

    expect(screen.getByText("All tasks completed!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed (1)" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Submit PR")).not.toBeInTheDocument();

    // Undo completion
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Submit PR")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Completed/ })).not.toBeInTheDocument();

    // Re-complete, expand Completed, clear all, and undo
    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Submit PR" as complete' }));
    await user.click(screen.getByRole("button", { name: "Completed (1)" }));
    expect(screen.getByText("Submit PR")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete all completed tasks" }));
    expect(screen.getByText("No tasks yet. Add one!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cleared 1 completed task");

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Completed (1)" })).toBeInTheDocument();
  });

  it("supports list rename/delete guards, global search, and theme switching", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    expect(screen.getByRole("button", { name: 'Delete list "My Tasks"' })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Create new list" }));
    await user.type(screen.getByLabelText("New list name"), "Groceries{Enter}");
    await user.type(screen.getByLabelText("New task text"), "Espresso beans");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    await user.click(screen.getByRole("button", { name: 'Rename list "Groceries"' }));
    const renameInput = screen.getByLabelText("List name");
    await user.clear(renameInput);
    await user.type(renameInput, "Market{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "Market" })).toBeInTheDocument();

    const searchInput = screen.getByLabelText("Search tasks");
    await user.type(searchInput, "Espresso");
    expect(screen.getByRole("heading", { level: 2, name: "Search results" })).toBeInTheDocument();
    expect(screen.getByText("Espresso beans")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.click(screen.getByRole("button", { name: 'Delete list "Market"' }));
    expect(screen.getByRole("heading", { level: 2, name: "My Tasks" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("manages 1-level subtasks, indent/outdent, parent completion cascade, and list sort modes", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    // Add two root tasks (root tasks insert at top: Zebra then Alpha)
    await user.type(screen.getByLabelText("New task text"), "Zebra");
    await user.click(screen.getByRole("button", { name: "Add Task" }));
    await user.type(screen.getByLabelText("New task text"), "Alpha");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    // Add subtask to Alpha
    await user.click(screen.getByRole("button", { name: 'Add subtask to "Alpha"' }));
    await user.type(screen.getByLabelText("New subtask text"), "Sub step{Enter}");
    const subtasksList = screen.getByRole("list", {
      name: 'Subtasks for "Alpha"',
    });
    expect(within(subtasksList).getByText("Sub step")).toBeInTheDocument();

    // Indent Zebra under Alpha
    await user.click(screen.getByRole("button", { name: 'Make "Zebra" a subtask' }));
    expect(within(subtasksList).getByText("Zebra")).toBeInTheDocument();

    // Outdent Zebra back to root
    await user.click(screen.getByRole("button", { name: 'Move "Zebra" to top level' }));
    expect(within(subtasksList).queryByText("Zebra")).not.toBeInTheDocument();

    // Sort by Title -> Alpha before Zebra
    await user.selectOptions(screen.getByLabelText("Sort tasks by"), "title");
    const rootItems = Array.from(
      document.querySelectorAll("ul.task-tree-list > li > .task-item .task-text"),
    ).map((el) => el.textContent);
    expect(rootItems).toEqual(["Alpha", "Zebra"]);

    // Completing parent Alpha also completes its subtask "Sub step", and Undo restores both
    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Alpha" as complete' }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Sub step")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed (2)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Sub step")).toBeInTheDocument();

    // Re-completing Alpha preserves hierarchy in Completed, and unchecking Alpha reopens both
    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Alpha" as complete' }));
    await user.click(screen.getByRole("button", { name: "Completed (2)" }));
    const completedSubtasksList = screen.getByRole("list", {
      name: 'Completed subtasks for "Alpha"',
    });
    expect(within(completedSubtasksList).getByText("Sub step")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Alpha" as incomplete' }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Sub step")).toBeInTheDocument();

    // Completing only "Sub step" shows it in Completed with a parent context badge while Alpha stays active
    await user.click(screen.getByRole("checkbox", { name: 'Mark task "Sub step" as complete' }));
    await user.click(screen.getByRole("button", { name: "Completed (1)" }));
    expect(screen.getByText(/Subtask of\s+“?Alpha”?/i)).toBeInTheDocument();
  });

  it("automatically migrates legacy v1 tasks into v2 workspace on load", async () => {
    localStorage.setItem(
      LEGACY_V1_STORAGE_KEY,
      JSON.stringify([
        { id: "v1-active", text: "Legacy active task", isCompleted: false },
        { id: "v1-done", text: "Legacy done task", isCompleted: true },
      ]),
    );

    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    expect(await screen.findByText("Legacy active task")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed (1)" })).toBeInTheDocument();
    expect(localStorage.getItem(WORKSPACE_V2_STORAGE_KEY)).not.toBeNull();
  });

  it("recovers from corrupted storage JSON with a dismissible alert banner", async () => {
    const user = userEvent.setup();
    localStorage.setItem(WORKSPACE_V2_STORAGE_KEY, "{corrupted-json");

    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/corrupted/i);
    expect(screen.getByText("No tasks yet. Add one!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss storage warning" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("synchronizes workspace changes from another tab via storage events", async () => {
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    const remoteSnapshot = {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      updatedAt: 999,
      lists: [
        {
          id: "remote-list",
          title: "Remote List",
          sortMode: "manual" as const,
          createdAt: 100,
          updatedAt: 999,
        },
      ],
      tasks: [
        {
          id: "remote-task",
          listId: "remote-list",
          parentId: null,
          title: "Synced from another tab",
          notes: "",
          dueDate: null,
          isCompleted: false,
          isStarred: false,
          position: 0,
          createdAt: 100,
          updatedAt: 999,
          completedAt: null,
        },
      ],
    };

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: WORKSPACE_V2_STORAGE_KEY,
          newValue: JSON.stringify(remoteSnapshot),
        }),
      );
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Remote List" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Synced from another tab")).toBeInTheDocument();
  });
});
