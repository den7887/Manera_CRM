"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";
import { cn } from "./utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within Dialog");
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function DialogTrigger({ onClick, asChild, children, ...props }: DialogTriggerProps) {
  const { onOpenChange } = useDialog();
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        children.props.onClick?.(e);
        onOpenChange(true);
      },
    });
  }
  
  return (
    <button
      data-slot="dialog-trigger"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

interface DialogPortalProps {
  children: React.ReactNode;
}

function DialogPortal({ children }: DialogPortalProps) {
  const { open } = useDialog();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!open || !mounted) return null;
  
  return createPortal(children, document.body);
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function DialogClose({ onClick, ...props }: DialogCloseProps) {
  const { onOpenChange } = useDialog();
  
  return (
    <button
      data-slot="dialog-close"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    />
  );
}

interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  const { onOpenChange } = useDialog();
  
  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 animate-in fade-in-0",
        className,
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  const { open } = useDialog();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  
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

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mediaQuery.matches);
    sync();

    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const enforcedProperties = [
      ["position", "fixed"],
      ["left", "0"],
      ["right", "0"],
      ["top", "auto"],
      ["bottom", "0"],
      ["width", "100vw"],
      ["max-width", "100vw"],
      ["margin", "0"],
      ["transform", "translate(0, 0)"],
      ["border-top-left-radius", "28px"],
      ["border-top-right-radius", "28px"],
      ["border-bottom-left-radius", "0"],
      ["border-bottom-right-radius", "0"],
      ["max-height", "92dvh"],
      ["overflow-y", "auto"],
    ] as const;

    if (isMobile) {
      enforcedProperties.forEach(([property, value]) => {
        node.style.setProperty(property, value, "important");
      });
      return;
    }

    enforcedProperties.forEach(([property]) => {
      node.style.removeProperty(property);
    });
  }, [isMobile, open]);
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "!fixed !inset-x-0 !bottom-0 !top-auto !left-0 !z-50 !m-0 !grid !w-screen !max-w-none !translate-x-0 !translate-y-0 gap-4 !rounded-t-[28px] !rounded-b-none !border-0 bg-[#FCFBF6] px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl animate-in fade-in-0 slide-in-from-bottom-6 duration-200 !max-h-[92dvh] overflow-y-auto",
          "sm:!bg-background sm:!top-[50%] sm:!left-[50%] sm:!bottom-auto sm:!inset-x-auto sm:!w-full sm:!max-w-[calc(100%-2rem)] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-lg sm:!border sm:!p-6 sm:!shadow-lg sm:zoom-in-95 sm:max-w-lg",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <DialogClose className="ring-offset-background focus:ring-ring absolute top-5 right-5 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 sm:top-4 sm:right-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
    </DialogPortal>
  );
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
