import * as React from "react";
import { cn } from "@/lib/utils";

// Initials fallback only — no remote images in MVP.
const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { name: string }
>(({ className, name, ...props }, ref) => {
  const initials = name
    .split(/[\s:_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      ref={ref}
      title={name}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-accent font-mono text-[10px] text-ink",
        className,
      )}
      {...props}
    >
      {initials || "·"}
    </span>
  );
});
Avatar.displayName = "Avatar";

export { Avatar };
