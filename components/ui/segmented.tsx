"use client";

import { motion } from "motion/react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export function SegmentedControl<T extends string>({
  id,
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  id: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-1 rounded-xl border border-line bg-canvas/60 p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-glow/60",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-lg bg-accent ring-1 ring-line"
              />
            )}
            {Icon && <Icon className="relative h-4 w-4 shrink-0" />}
            <span className="relative truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
