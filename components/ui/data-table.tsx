import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-widest text-muted">
        {children}
      </tr>
    </thead>
  );
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-b border-line/50 transition-colors last:border-0 hover:bg-accent/40", className)}>{children}</tr>;
}

export function TH({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-2 py-2 font-medium first:pl-0 last:pr-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  align = "left",
  mono = false,
  colSpan,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-2 py-2.5 align-top first:pl-0 last:pr-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono text-[12px]",
        className,
      )}
    >
      {children}
    </td>
  );
}
