"use client";

import * as React from "react";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "./utils";

interface MenubarContextValue {
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
}

const MenubarContext = React.createContext<MenubarContextValue | null>(null);

function useMenubar() {
  const context = React.useContext(MenubarContext);
  if (!context) {
    throw new Error("Menubar components must be used within Menubar");
  }
  return context;
}

interface MenubarProps extends React.HTMLAttributes<HTMLDivElement> {}

function Menubar({ className, children, ...props }: MenubarProps) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  return (
    <MenubarContext.Provider value={{ openMenu, setOpenMenu }}>
      <div
        data-slot="menubar"
        className={cn(
          "bg-background flex h-9 items-center gap-1 rounded-md border p-1",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
}

interface MenubarMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  menuId: string;
}

const MenubarMenuContext = React.createContext<MenubarMenuContextValue | null>(null);

function useMenubarMenu() {
  const context = React.useContext(MenubarMenuContext);
  if (!context) {
    throw new Error("MenubarMenu components must be used within MenubarMenu");
  }
  return context;
}

interface MenubarMenuProps {
  children: React.ReactNode;
  value?: string;
}

function MenubarMenu({ children, value }: MenubarMenuProps) {
  const menuId = value || React.useId();
  const { openMenu, setOpenMenu } = useMenubar();
  const open = openMenu === menuId;
  const setOpen = (newOpen: boolean) => {
    setOpenMenu(newOpen ? menuId : null);
  };

  return (
    <MenubarMenuContext.Provider value={{ open, setOpen, menuId }}>
      <div data-slot="menubar-menu">{children}</div>
    </MenubarMenuContext.Provider>
  );
}

interface MenubarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const MenubarTrigger = React.forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const { open, setOpen } = useMenubarMenu();

    return (
      <button
        ref={ref}
        data-slot="menubar-trigger"
        data-state={open ? "open" : "closed"}
        className={cn(
          "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-hidden focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
          setOpen(!open);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

MenubarTrigger.displayName = "MenubarTrigger";

interface MenubarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

const MenubarContent = React.forwardRef<HTMLDivElement, MenubarContentProps>(
  ({ className, align = "start", children, ...props }, ref) => {
    const { open, setOpen } = useMenubarMenu();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!open) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <div
        ref={contentRef}
        data-slot="menubar-content"
        className={cn(
          "bg-popover text-popover-foreground absolute z-50 min-w-48 overflow-hidden rounded-md border p-1 shadow-md animate-in fade-in-0 zoom-in-95",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MenubarContent.displayName = "MenubarContent";

interface MenubarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const MenubarItem = React.forwardRef<HTMLDivElement, MenubarItemProps>(
  ({ className, inset, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-item"
        role="menuitem"
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          inset && "pl-8",
          className,
        )}
        {...props}
      />
    );
  }
);

MenubarItem.displayName = "MenubarItem";

interface MenubarCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
}

const MenubarCheckboxItem = React.forwardRef<HTMLDivElement, MenubarCheckboxItemProps>(
  ({ className, checked, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-checkbox-item"
        role="menuitemcheckbox"
        aria-checked={checked}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          {checked && <CheckIcon className="size-4" />}
        </span>
        {children}
      </div>
    );
  }
);

MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

interface MenubarRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
}

const MenubarRadioItem = React.forwardRef<HTMLDivElement, MenubarRadioItemProps>(
  ({ className, checked, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-radio-item"
        role="menuitemradio"
        aria-checked={checked}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-3.5 items-center justify-center">
          {checked && <CircleIcon className="size-2 fill-current" />}
        </span>
        {children}
      </div>
    );
  }
);

MenubarRadioItem.displayName = "MenubarRadioItem";

interface MenubarLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const MenubarLabel = React.forwardRef<HTMLDivElement, MenubarLabelProps>(
  ({ className, inset, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-label"
        className={cn(
          "px-2 py-1.5 text-sm font-semibold",
          inset && "pl-8",
          className,
        )}
        {...props}
      />
    );
  }
);

MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-separator"
        role="separator"
        className={cn("bg-muted -mx-1 my-1 h-px", className)}
        {...props}
      />
    );
  }
);

MenubarSeparator.displayName = "MenubarSeparator";

interface MenubarShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
}

MenubarShortcut.displayName = "MenubarShortcut";

interface MenubarSubProps {
  children: React.ReactNode;
}

function MenubarSub({ children }: MenubarSubProps) {
  return <div data-slot="menubar-sub">{children}</div>;
}

interface MenubarSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const MenubarSubTrigger = React.forwardRef<HTMLDivElement, MenubarSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-sub-trigger"
        role="menuitem"
        className={cn(
          "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          inset && "pl-8",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronRightIcon className="ml-auto size-4" />
      </div>
    );
  }
);

MenubarSubTrigger.displayName = "MenubarSubTrigger";

interface MenubarSubContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const MenubarSubContent = React.forwardRef<HTMLDivElement, MenubarSubContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="menubar-sub-content"
        className={cn(
          "bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
          className,
        )}
        {...props}
      />
    );
  }
);

MenubarSubContent.displayName = "MenubarSubContent";

const MenubarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    return <div ref={ref} data-slot="menubar-group" role="group" {...props} />;
  }
);

MenubarGroup.displayName = "MenubarGroup";

const MenubarPortal = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const MenubarRadioGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    return <div ref={ref} data-slot="menubar-radio-group" role="group" {...props} />;
  }
);

MenubarRadioGroup.displayName = "MenubarRadioGroup";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarShortcut,
};
