import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Sk({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-line", className)} />;
}

export function PageHeadSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return (
    <div aria-hidden>
      <Sk className={cn("h-7", titleWidth)} />
      <Sk className="mt-2 h-3.5 w-64" />
    </div>
  );
}

export function FormCardSkeleton({ fields = 2, className }: { fields?: number; className?: string }) {
  return (
    <Card className={cn("mb-4", className)} aria-hidden>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-2">
          <Sk className="h-10 flex-1 rounded-lg" />
          <Sk className="h-10 flex-1 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <Sk className="mb-1.5 h-3 w-24" />
              <Sk className="h-9 w-full" />
            </div>
          ))}
        </div>
        <Sk className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function TableCardSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className} aria-hidden>
      <CardContent className="p-4">
        <div className="mb-3 flex gap-2">
          <Sk className="h-8 w-20" />
          <Sk className="h-8 w-20" />
          <Sk className="h-8 flex-1" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line/50 pb-2.5">
              <Sk className="h-4 w-24" />
              <Sk className="h-5 w-16" />
              <Sk className="ml-auto h-4 w-28" />
              <Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
