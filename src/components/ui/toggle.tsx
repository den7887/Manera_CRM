"use client";

import * as React from "react";
import { cn } from "./utils";

const toggleVariants = {
  variant: {
    default: "bg-transparent",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  },
  size: {
    default: "h-9 px-2 min-w-9",
    sm: "h-8 px-1.5 min-w-8",
    lg: "h-10 px-2.5 min-w-10",
  },
};

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof toggleVariants.variant;
  size?: keyof typeof toggleVariants.size;
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant = "default", size = "default", pressed, onPressedChange, onClick, ...props }, ref) => {
    const [internalPressed, setInternalPressed] = React.useState(false);
    const isPressed = pressed !== undefined ? pressed : internalPressed;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const newPressed = !isPressed;
      if (pressed === undefined) {
        setInternalPressed(newPressed);
      }
      onPressedChange?.(newPressed);
      onClick?.(e);
    };

    const baseClasses = "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap";
    const variantClass = toggleVariants.variant[variant];
    const sizeClass = toggleVariants.size[size];

    return (
      <button
        ref={ref}
        data-slot="toggle"
        data-state={isPressed ? "on" : "off"}
        aria-pressed={isPressed}
        className={cn(baseClasses, variantClass, sizeClass, className)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
