"use client";

import * as React from "react";
import { cn } from "./utils";

interface ToggleGroupContextValue {
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  type: "single" | "multiple";
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroup() {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroup components must be used within ToggleGroup");
  }
  return context;
}

interface ToggleGroupSingleProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "single";
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

interface ToggleGroupMultipleProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "multiple";
  value?: string[];
  onValueChange?: (value: string[]) => void;
  defaultValue?: string[];
}

type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

function ToggleGroup({
  className,
  type,
  value: controlledValue,
  onValueChange,
  defaultValue,
  children,
  ...props
}: ToggleGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue || (type === "single" ? "" : [])
  );
  
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = onValueChange || setUncontrolledValue;

  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange: setValue as any, type }}>
      <div
        data-slot="toggle-group"
        role="group"
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value: itemValue, onClick, ...props }, ref) => {
    const { value, onValueChange, type } = useToggleGroup();
    
    const isActive = type === "single" 
      ? value === itemValue 
      : Array.isArray(value) && value.includes(itemValue);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      
      if (type === "single") {
        onValueChange(isActive ? "" : itemValue);
      } else {
        const currentValue = Array.isArray(value) ? value : [];
        const newValue = isActive
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];
        onValueChange(newValue);
      }
    };

    return (
      <button
        ref={ref}
        data-slot="toggle-group-item"
        data-state={isActive ? "on" : "off"}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-accent text-accent-foreground",
          className,
        )}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
