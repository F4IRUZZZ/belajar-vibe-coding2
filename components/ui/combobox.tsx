"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function Combobox({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const listId = `${id ?? "cb"}-${uid}`;
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [value, suggestions]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  useEffect(() => {
    if (open) itemRefs.current[hl]?.scrollIntoView({ block: "nearest" });
  }, [hl, open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-activedescendant={open && filtered[hl] ? `${listId}-${hl}` : undefined}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setHl(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHl((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHl((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && open && filtered[hl]) {
              e.preventDefault();
              choose(filtered[hl]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="pr-9"
        />
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="anim-pop absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-overlay"
        >
          {filtered.map((s, i) => (
            <li key={s} id={`${listId}-${i}`} role="option" aria-selected={value === s}>
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                onMouseEnter={() => setHl(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  i === hl ? "bg-accent text-ink" : "text-muted",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{s}</span>
                {value === s && <Check className="size-3.5 shrink-0 text-glow" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
