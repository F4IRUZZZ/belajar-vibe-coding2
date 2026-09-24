import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-line bg-transparent px-3 text-sm outline-none placeholder:text-muted focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-glow",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
