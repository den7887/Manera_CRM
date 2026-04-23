"use client";

import * as React from "react";
import { CircleIcon } from "lucide-react";
import { cn } from "./utils";

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error("RadioGroup components must be used within RadioGroup");
  }
  return context;
}

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value: controlledValue, onValueChange, defaultValue, name, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
    
    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
    const setValue = onValueChange || setUncontrolledValue;

    return (
      <RadioGroupContext.Provider value={{ value, onValueChange: setValue, name }}>
        <div
          ref={ref}
          data-slot="radio-group"
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        />
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value: itemValue, ...props }, ref) => {
    const { value, onValueChange, name } = useRadioGroup();
    const isChecked = value === itemValue;

    return (
      <label
        className={cn(
          "aspect-square size-4 rounded-full border border-primary text-primary shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <input
          ref={ref}
          type="radio"
          className="sr-only"
          name={name}
          value={itemValue}
          checked={isChecked}
          onChange={() => onValueChange(itemValue)}
          {...props}
        />
        <div className="flex items-center justify-center size-full">
          {isChecked && <CircleIcon className="size-2.5 fill-primary" />}
        </div>
      </label>
    );
  }
);

RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
