import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";
import App from "./App";
import { LocalStorageTaskRepository } from "./storage/LocalStorageTaskRepository";

describe("App shell and core workflows", () => {
  it("hydrates default list and supports adding, editing, toggling, and deleting a task", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    expect(await screen.findByText("No tasks yet. Add one!")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "My Tasks" })).toBeInTheDocument();

    const input = screen.getByLabelText("New task text");
    await user.type(input, "Buy milk");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet. Add one!")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: 'Edit task "Buy milk"' }));
    const editInput = screen.getByLabelText('Edit task text for "Buy milk"');
    await user.clear(editInput);
    await user.type(editInput, "Buy oat milk{Enter}");

    expect(screen.getByText("Buy oat milk")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", {
      name: 'Mark task "Buy oat milk" as complete',
    });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: 'Delete task "Buy oat milk"' }));
    expect(screen.queryByText("Buy oat milk")).not.toBeInTheDocument();
    expect(screen.getByText("No tasks yet. Add one!")).toBeInTheDocument();
  });

  it("creates, switches, renames, and deletes lists while guarding the last list", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    // Last remaining list cannot be deleted
    expect(screen.getByRole("button", { name: 'Delete list "My Tasks"' })).toBeDisabled();

    // Create a second list
    await user.click(screen.getByRole("button", { name: "Create new list" }));
    const newListInput = screen.getByLabelText("New list name");
    await user.type(newListInput, "Groceries{Enter}");

    expect(screen.getByRole("heading", { level: 2, name: "Groceries" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("New task text"), "Espresso beans");
    await user.click(screen.getByRole("button", { name: "Add Task" }));
    expect(screen.getByText("Espresso beans")).toBeInTheDocument();

    // Rename Groceries -> Market
    await user.click(screen.getByRole("button", { name: 'Rename list "Groceries"' }));
    const renameInput = screen.getByLabelText("List name");
    await user.clear(renameInput);
    await user.type(renameInput, "Market{Enter}");

    expect(screen.getByRole("heading", { level: 2, name: "Market" })).toBeInTheDocument();

    // Delete Market and fall back to My Tasks
    await user.click(screen.getByRole("button", { name: 'Delete list "Market"' }));
    expect(screen.getByRole("heading", { level: 2, name: "My Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Delete list "My Tasks"' })).toBeDisabled();
  });

  it("switches to Starred view, searches across lists, and updates theme", async () => {
    const user = userEvent.setup();
    const repository = new LocalStorageTaskRepository();
    render(<App repository={repository} />);

    await screen.findByText("No tasks yet. Add one!");

    await user.type(screen.getByLabelText("New task text"), "Prepare slides");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    // Starred view empty state
    const nav = screen.getByRole("navigation", { name: "Task lists" });
    await user.click(within(nav).getByRole("button", { name: /Starred/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Starred" })).toBeInTheDocument();
    expect(screen.getByText("No starred tasks yet.")).toBeInTheDocument();

    // Global search in header
    const searchInput = screen.getByLabelText("Search tasks");
    await user.type(searchInput, "slides");
    expect(screen.getByRole("heading", { level: 2, name: "Search results" })).toBeInTheDocument();
    expect(screen.getByText("Prepare slides")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { level: 2, name: "Starred" })).toBeInTheDocument();

    // Theme selector
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
