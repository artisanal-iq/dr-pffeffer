"use client";

import React, { useEffect, useId, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export type ProjectNameSelectorProps = {
  value: string;
  onSubmit: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  id?: string;
};

export function ProjectNameSelector({
  value,
  onSubmit,
  suggestions,
  placeholder,
  disabled,
  ariaLabel,
  className,
  id,
}: ProjectNameSelectorProps) {
  const autoId = useId();
  const inputId = id ?? `project-name-${autoId}`;
  const datalistId = `${inputId}-options`;
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const trimmed = draft.trim();
    if (trimmed === value.trim()) return;
    onSubmit(trimmed);
  };

  const handleBlur = () => {
    commit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <input
        id={inputId}
        list={datalistId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40",
          disabled && "cursor-not-allowed opacity-70"
        )}
      />
      <datalist id={datalistId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  );
}
