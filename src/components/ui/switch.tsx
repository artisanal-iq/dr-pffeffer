"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">;

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(({ checked, defaultChecked, onCheckedChange, className, disabled, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const current = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const next = !current;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={current}
      data-state={current ? "checked" : "unchecked"}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        current ? "bg-foreground" : "bg-muted",
        className
      )}
      onClick={handleToggle}
      disabled={disabled}
      ref={ref}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          current ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
});
Switch.displayName = "Switch";

export { Switch };
