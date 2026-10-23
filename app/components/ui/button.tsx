import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "amber";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default:
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
      amber:
        "bg-amber-500 text-slate-950 font-semibold shadow-sm hover:bg-amber-400 active:scale-[0.98]",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
      outline:
        "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
      ghost:
        "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-xl px-6 text-base font-medium",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
