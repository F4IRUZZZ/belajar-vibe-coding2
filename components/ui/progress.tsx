import * as React from "react";
import { cn } from "@/lib/utils";

// Determinate only — indicator glides via transform (no layout thrash).
const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value)}
    className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line/60", className)}
    {...props}
  >
    <div
      className="h-full rounded-full bg-gradient-to-r from-muted via-ink to-ink transition-transform duration-700 ease-out"
      style={{ transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})`, transformOrigin: "left" }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
