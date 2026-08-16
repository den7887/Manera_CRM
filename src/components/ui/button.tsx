import * as React from "react";
import { cn } from "./utils";

const buttonVariantClasses = {
  variant: {
    default: "bg-[#133C2A] text-white hover:bg-[#0F3021]",
    destructive:
      "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
    outline:
      "border border-[#133C2A]/15 bg-white text-[#133C2A] hover:bg-[#EEF5F0] hover:text-[#133C2A] dark:bg-input/30 dark:border-[#133C2A]/15 dark:hover:bg-[#133C2A]/10",
    secondary: "bg-[#EEF5F0] text-[#133C2A] hover:bg-[#E3EFE7]",
    ghost: "text-[#133C2A] hover:bg-[#EEF5F0] hover:text-[#133C2A] dark:hover:bg-[#133C2A]/10",
    link: "text-[#133C2A] underline-offset-4 hover:underline",
  },
  size: {
    default: "h-9 px-4 py-2 has-[>svg]:px-3",
    sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
    lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
    icon: "size-9 rounded-md",
  },
};

type ButtonVariant = keyof typeof buttonVariantClasses.variant;
type ButtonSize = keyof typeof buttonVariantClasses.size;

const buttonBaseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

function normalizeButtonClassName(className?: string) {
  if (!className) return className;

  return className
    .replace(/\bbg-gradient-to-r\b/g, "")
    .replace(/\bfrom-\[#133C2A\]\b/g, "")
    .replace(/\bfrom-\[#D14343\]\b/g, "")
    .replace(/\bto-\[#D4AF37\]\b/g, "")
    .replace(/\bto-\[#1C8C64\]\b/g, "")
    .replace(/\bhover:opacity-90\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    buttonBaseClasses,
    buttonVariantClasses.variant[variant],
    buttonVariantClasses.size[size],
    normalizeButtonClassName(className),
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const combinedClassName = buttonVariants({ variant, size, className });

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: combinedClassName,
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        data-slot="button"
        className={combinedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
