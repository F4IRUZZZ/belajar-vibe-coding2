import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors outline-none active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ink text-canvas shadow hover:bg-white",
        secondary: "bg-accent text-ink border border-line hover:border-muted",
        outline: "border border-line text-muted hover:text-ink hover:border-muted",
        ghost: "text-muted hover:text-ink hover:bg-accent",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-[13px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
