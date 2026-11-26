import { useEffect, useRef, type ReactElement } from "react";
import type { UndoEntry } from "../domain/types";
import { CloseIcon } from "./Icons";

interface UndoSnackbarProps {
  readonly undoEntry: UndoEntry | null;
  readonly onUndo: () => void;
  readonly onDismiss: () => void;
  readonly autoHideDurationMs?: number;
}

export function UndoSnackbar({
  undoEntry,
  onUndo,
  onDismiss,
  autoHideDurationMs = 5000,
}: UndoSnackbarProps): ReactElement | null {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const entryId = undoEntry?.id ?? null;

  useEffect(() => {
    if (entryId === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      onDismissRef.current();
    }, autoHideDurationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [entryId, autoHideDurationMs]);

  if (undoEntry === null) {
    return null;
  }

  return (
    <output className="undo-snackbar" aria-live="polite" aria-atomic="true">
      <span className="undo-snackbar-label">{undoEntry.label}</span>
      <div className="undo-snackbar-actions">
        <button type="button" className="undo-snackbar-button" onClick={onUndo}>
          Undo
        </button>
        <button
          type="button"
          className="icon-button icon-button-sm undo-snackbar-close"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </output>
  );
}
