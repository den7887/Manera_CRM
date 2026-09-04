import { MouseEvent, ReactElement, cloneElement, useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from './drawer';

export interface ResponsiveActionMenuItem {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * A "..." action menu that renders as a Radix DropdownMenu on desktop
 * (mouse-driven, works fine there) and as a bottom Drawer sheet on mobile.
 *
 * Radix DropdownMenu/Popover/Select all rely on a body-level pointer-events
 * lock + outside-pointerdown dismissal that iOS Safari has long-standing,
 * hard-to-pin-down reliability issues with inside scrollable card lists --
 * a tap can open the menu once and then stop registering on that trigger
 * (or others like it) until the page reloads. The Drawer/vaul-based sheet
 * used across the app's Клиенты cards does not hit this, so mobile routes
 * through that instead of chasing the Radix issue further.
 */
export function ResponsiveActionMenu({
  trigger,
  items,
  title = 'Действия',
  align = 'end',
}: {
  trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
  items: ResponsiveActionMenuItem[];
  title?: string;
  align?: 'start' | 'end' | 'center';
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    const mobileTrigger = cloneElement(trigger, {
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        trigger.props.onClick?.(event);
        setOpen(true);
      },
    });

    return (
      <>
        {mobileTrigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="rounded-t-[28px] border-[#133C2A]/10 bg-[#FCFAF0]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-[#133C2A]">{title}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-2 px-4 pb-2">
              {items.map((item) => (
                <Button
                  key={item.key}
                  variant="outline"
                  className={`h-12 w-full justify-start rounded-2xl ${
                    item.destructive
                      ? 'border-[#D14343]/25 text-[#D14343] hover:bg-[#D14343]/8 hover:text-[#D14343]'
                      : 'border-[#133C2A]/12'
                  }`}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <DrawerFooter>
              <Button variant="outline" className="rounded-2xl border-[#133C2A]/12" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 rounded-2xl" onClick={(event) => event.stopPropagation()}>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            variant={item.destructive ? 'destructive' : 'default'}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
