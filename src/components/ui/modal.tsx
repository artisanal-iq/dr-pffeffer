"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({ open, title, description, onClose, children, footer, className }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) return null;

  return (
    <div className="planner-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <div className="planner-modal__backdrop" data-testid="modal-backdrop" onClick={onClose} />
      <div className={cn("planner-modal__body", className)}>
        <h2 id={titleId} className="planner-modal__title">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="planner-modal__description">
            {description}
          </p>
        ) : null}
        <div>{children}</div>
        {footer ? <div className="planner-modal__actions">{footer}</div> : null}
      </div>
    </div>
  );
}
