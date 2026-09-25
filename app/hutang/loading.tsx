import { Card, CardContent } from "@/components/ui/card";
import { FormCardSkeleton, PageHeadSkeleton, Sk } from "@/components/skeletons";

function SectionSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Card className="mb-4" aria-hidden>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Sk className={`h-4 ${titleWidth}`} />
          <Sk className="h-3.5 w-32" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line/50 pb-2.5">
              <div className="flex-1">
                <Sk className="h-4 w-28" />
                <Sk className="mt-1.5 h-3 w-44" />
              </div>
              <Sk className="h-4 w-24" />
              <Sk className="h-5 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Loading() {
  return (
    <div role="status" aria-label="Memuat hutang">
      <div className="mb-4">
        <PageHeadSkeleton titleWidth="w-28" />
      </div>
      <FormCardSkeleton fields={4} />
      <SectionSkeleton titleWidth="w-20" />
      <SectionSkeleton titleWidth="w-24" />
      <span className="sr-only">Memuat hutang…</span>
    </div>
  );
}
