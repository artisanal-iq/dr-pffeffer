"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/calendar";
import { formatLocalRange } from "@/lib/planner/utils";

type Props = {
  open: boolean;
  target: CalendarEvent | null;
  conflicts: CalendarEvent[];
  onCancel: () => void;
  onConfirm: () => void;
  timeZone?: string;
};

export function ConflictModal({ open, target, conflicts, onCancel, onConfirm, timeZone }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open || !target) {
      return undefined;
    }

    const dialog = bodyRef.current;
    if (!dialog) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([type='hidden']):not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelectors)).filter((element) =>
        element.offsetParent !== null || element === document.activeElement
      );

    const focusFirstElement = () => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        dialog.focus({ preventScroll: true });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const currentIndex = current ? focusable.indexOf(current) : -1;
      let nextIndex = currentIndex;
      if (event.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
      }

      focusable[nextIndex].focus({ preventScroll: true });
      event.preventDefault();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) {
        focusFirstElement();
      }
    };

    const raf = requestAnimationFrame(focusFirstElement);
    dialog.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      cancelAnimationFrame(raf);
      dialog.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      const previouslyFocused = previouslyFocusedRef.current as HTMLElement | null;
      if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, target, onCancel]);

  if (!open || !target) return null;

  return (
    <div
      className="planner-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="planner-modal__backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="planner-modal__body" ref={bodyRef} tabIndex={-1}>
        <h2 className="planner-modal__title" id={titleId}>
          Schedule conflict
        </h2>
        <p className="planner-modal__description" id={descriptionId}>
          Moving <strong>{target.title}</strong> will overlap with the tasks below. Do you want to keep the new time anyway?
        </p>
        <ul className="planner-modal__list">
          {conflicts.map((conflict) => (
            <li key={conflict.id} className="planner-modal__list-item">
              <span className="planner-modal__list-title">{conflict.title}</span>
              <span className="planner-modal__list-time">
                {formatLocalRange(conflict.start, conflict.end, undefined, timeZone)}
              </span>
            </li>
          ))}
        </ul>
        <div className="planner-modal__actions">
          <Button variant="secondary" onClick={onCancel} data-testid="conflict-cancel">
            Cancel
          </Button>
          <Button onClick={onConfirm} data-testid="conflict-confirm">
            Keep new time
          </Button>
        </div>
      </div>
    </div>
  );
}
