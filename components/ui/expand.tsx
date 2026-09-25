"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { TD } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Konten yang mengembang/menyusut halus mengikuti tingginya.
 * `overflow-hidden` hanya aktif selama animasi berjalan agar dropdown
 * (Select/Combobox) di dalamnya tidak terpotong setelah terbuka penuh.
 */
export function Expand({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(true);
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
          onAnimationStart={() => setSettled(false)}
          onAnimationComplete={() => setSettled(true)}
          className={cn(!settled && "overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Baris detail tabel yang selalu terpasang agar tingginya bertransisi mulus. */
export function ExpandableRow({
  open,
  colSpan,
  children,
  className,
}: {
  open: boolean;
  colSpan: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("bg-accent/40", open && "border-b border-line/50", className)}>
      <TD colSpan={colSpan} className={cn("px-4 transition-[padding] duration-200", open ? "py-2" : "py-0")}>
        <Expand open={open}>{children}</Expand>
      </TD>
    </tr>
  );
}
