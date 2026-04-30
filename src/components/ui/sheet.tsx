"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "./utils";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within Sheet");
  }
  return context;
}

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open: controlledOpen, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  return (
    <SheetContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function SheetTrigger({ onClick, ...props }: SheetTriggerProps) {
  const { onOpenChange } = useSheet();
  
  return (
    <button
      data-slot="sheet-trigger"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    />
  );
}

interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function SheetClose({ onClick, ...props }: SheetCloseProps) {
  const { onOpenChange } = useSheet();
  
  return (
    <button
      data-slot="sheet-close"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    />
  );
}

interface SheetPortalProps {
  children: React.ReactNode;
}

function SheetPortal({ children }: SheetPortalProps) {
  const { open } = useSheet();
  
  if (!open) return null;
  
  return <>{children}</>;
}

interface SheetOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  const { onOpenChange } = useSheet();
  
  return (
    <div
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 animate-in fade-in-0",
        className,
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left";
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: SheetContentProps) {
  const { open } = useSheet();
  
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  
  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        data-slot="sheet-content"
        className={cn(
          "bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out duration-500",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm animate-in slide-in-from-right",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm animate-in slide-in-from-left",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b animate-in slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t animate-in slide-in-from-bottom",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <SheetClose className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>
    </SheetPortal>
  );
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

interface SheetDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
