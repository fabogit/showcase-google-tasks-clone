import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createEmptyWorkspace } from "../domain/schema";
import { UndoSnackbar } from "./UndoSnackbar";

describe("UndoSnackbar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders status alert, triggers undo and dismiss, and auto-hides", () => {
    vi.useFakeTimers();

    const onUndo = vi.fn<() => void>();
    const onDismiss = vi.fn<() => void>();

    const { rerender } = render(
      <UndoSnackbar
        undoEntry={{
          id: "u1",
          label: "Task deleted",
          previousSnapshot: createEmptyWorkspace({
            now: () => 1,
            createId: () => "l1",
          }),
        }}
        onUndo={onUndo}
        onDismiss={onDismiss}
        autoHideDurationMs={3000}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Task deleted");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(2);

    rerender(<UndoSnackbar undoEntry={null} onUndo={onUndo} onDismiss={onDismiss} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
