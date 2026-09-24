"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(-1);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const listId = `${id ?? "sel"}-${uid}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, options, value]);

  useEffect(() => {
    if (open) itemRefs.current[hl]?.scrollIntoView({ block: "nearest" });
  }, [hl, open]);

  const openList = () => {
    if (disabled) return;
    setHl(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options[hl] ? `${listId}-${hl}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (["ArrowDown", "Enter", " "].includes(e.key) && !open) {
            e.preventDefault();
            openList();
          }
        }}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-line bg-transparent px-2.5 text-left text-sm outline-none transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder ?? "…"}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          tabIndex={-1}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "Tab") {
              setOpen(false);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setHl((i) => Math.min(options.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHl((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && hl >= 0 && options[hl]) {
              e.preventDefault();
              choose(options[hl].value);
            }
          }}
          className="anim-pop absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-overlay"
        >
          {options.map((o, i) => (
            <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={o.value === value}>
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                onMouseEnter={() => setHl(i)}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  i === hl ? "bg-accent text-ink" : "text-muted",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && <Check className="size-3.5 shrink-0 text-glow" />}
              </button>
            </li>
          ))}
          {options.length === 0 && (
            <li className="px-2.5 py-2 font-mono text-xs text-muted">— kosong</li>
          )}
        </ul>
      )}
    </div>
  );
}
