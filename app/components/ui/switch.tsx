"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          checked ? "bg-amber-500" : "bg-muted/40",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
            checked ? "translate-x-5.5" : "translate-x-0.5"
          )}
        />
      </label>
    );
  }
);
Switch.displayName = "Switch";
