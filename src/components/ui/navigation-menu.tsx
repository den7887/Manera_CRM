import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "./utils";

interface NavigationMenuContextValue {
  openItem: string | null;
  setOpenItem: (item: string | null) => void;
}

const NavigationMenuContext = React.createContext<NavigationMenuContextValue | null>(null);

function useNavigationMenu() {
  const context = React.useContext(NavigationMenuContext);
  if (!context) {
    throw new Error("Navigation menu components must be used within NavigationMenu");
  }
  return context;
}

interface NavigationMenuProps extends React.HTMLAttributes<HTMLElement> {
  viewport?: boolean;
}

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: NavigationMenuProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  return (
    <NavigationMenuContext.Provider value={{ openItem, setOpenItem }}>
      <nav
        data-slot="navigation-menu"
        data-viewport={viewport}
        className={cn(
          "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </NavigationMenuContext.Provider>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = () => 
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1";

interface NavigationMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
}

function NavigationMenuTrigger({
  className,
  children,
  value,
  ...props
}: NavigationMenuTriggerProps) {
  const { openItem, setOpenItem } = useNavigationMenu();
  const itemId = value || React.useId();
  const isOpen = openItem === itemId;

  return (
    <button
      data-slot="navigation-menu-trigger"
      data-state={isOpen ? "open" : "closed"}
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      onClick={() => setOpenItem(isOpen ? null : itemId)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  );
}

interface NavigationMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
}

function NavigationMenuContent({
  className,
  value,
  children,
  ...props
}: NavigationMenuContentProps) {
  const { openItem } = useNavigationMenu();
  const itemId = value || React.useId();
  const isOpen = openItem === itemId;

  if (!isOpen) return null;

  return (
    <div
      data-slot="navigation-menu-content"
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "absolute top-full left-0 w-full p-2 pr-2.5 md:w-auto",
        "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 mt-1.5 overflow-hidden rounded-md border shadow duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 isolate z-50 flex justify-center",
      )}
    >
      <div
        data-slot="navigation-menu-viewport"
        className={cn(
          "origin-top-center bg-popover text-popover-foreground relative mt-1.5 overflow-hidden rounded-md border shadow",
          className,
        )}
        {...props}
      />
    </div>
  );
}

interface NavigationMenuLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

function NavigationMenuLink({
  className,
  active,
  ...props
}: NavigationMenuLinkProps) {
  return (
    <a
      data-slot="navigation-menu-link"
      data-active={active}
      className={cn(
        "data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </div>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
