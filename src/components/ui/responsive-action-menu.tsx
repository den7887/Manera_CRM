import { MouseEvent, ReactElement, cloneElement, useRef, useState } from 'react';
import { Button } from './button';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from './drawer';

export interface ResponsiveActionMenuItem {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * A "..." action menu, rendered as a bottom Drawer sheet on every device.
 *
 * This used to render a Radix DropdownMenu on desktop and only fall back to
 * a Drawer on mobile, on the assumption that DropdownMenu was fine with a
 * mouse. It was not reliable there either -- same trigger/dismissal
 * machinery, same class of bug. Rather than keep chasing DropdownMenu's
 * behavior, every "..." menu in the app now goes through one single,
 * plain-React, portal-free-of-Radix path: a real onClick opens it, a real
 * onClick closes it, nothing depends on pointerdown timing or an outside-
 * click layer.
 */
export function ResponsiveActionMenu({
  trigger,
  items,
  title = 'Действия',
}: {
  trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
  items: ResponsiveActionMenuItem[];
  title?: string;
  /** @deprecated kept so existing call sites don't need to change; unused now that there's only one layout. */
  align?: 'start' | 'end' | 'center';
}) {
  const [open, setOpen] = useState(false);

  // Closing the sheet (backdrop tap or swipe-down, sometimes even the
  // Закрыть button on touch devices) can let the same touch synthesize a
  // click that lands on whatever card sits underneath once the sheet's
  // portal content is gone, opening it unintentionally. Swallow exactly
  // one click right after any close, regardless of how it closed.
  const suppressNextClickRef = useRef(false);

  const closeDrawer = () => {
    setOpen(false);
    suppressNextClickRef.current = true;
    const swallow = (event: globalThis.MouseEvent) => {
      document.removeEventListener('click', swallow, true);
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        event.stopPropagation();
        event.preventDefault();
      }
    };
    document.addEventListener('click', swallow, true);
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
      document.removeEventListener('click', swallow, true);
    }, 400);
  };

  const wrappedTrigger = cloneElement(trigger, {
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      trigger.props.onClick?.(event);
      setOpen(true);
    },
  });

  return (
    <>
      {wrappedTrigger}
      <Drawer open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDrawer())}>
        {/* Vaul portals this content to document.body, but React still bubbles
            its synthetic events up through the *component* tree (this Drawer
            is a JSX child of whatever Card rendered the "..." trigger) -- so
            without stopping propagation here, tapping Закрыть or any item
            also fires the Card's own onClick underneath. */}
        <DrawerContent
          className="rounded-t-[28px] border-[#133C2A]/10 bg-[#FCFAF0]"
          onClick={(event) => event.stopPropagation()}
        >
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
                onClick={(event) => {
                  event.stopPropagation();
                  closeDrawer();
                  item.onClick();
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <DrawerFooter>
            <Button
              variant="outline"
              className="rounded-2xl border-[#133C2A]/12"
              onClick={(event) => {
                event.stopPropagation();
                closeDrawer();
              }}
            >
              Закрыть
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
