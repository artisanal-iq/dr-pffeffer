"use client";

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
  if (!open || !target) return null;
  return (
    <div className="planner-modal" role="alertdialog" aria-modal="true">
      <div className="planner-modal__backdrop" onClick={onCancel} />
      <div className="planner-modal__body">
        <h2 className="planner-modal__title">Schedule conflict</h2>
        <p className="planner-modal__description">
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
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Keep new time</Button>
        </div>
      </div>
    </div>
  );
}
