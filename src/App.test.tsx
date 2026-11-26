import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";
import App from "./App";

describe("App smoke test", () => {
  it("renders empty state and supports adding, toggling, editing, and deleting a task", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("No tasks yet. Add one!")).toBeInTheDocument();

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
});
