import { Card, CardContent } from "@/components/ui/card";
import { FormCardSkeleton, PageHeadSkeleton, Sk } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-label="Memuat produk">
      <div className="mb-4">
        <PageHeadSkeleton titleWidth="w-28" />
      </div>
      <FormCardSkeleton fields={2} />
      <Card aria-hidden>
        <CardContent className="space-y-2.5 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line/50 pb-2.5">
              <Sk className="h-4 w-32" />
              <Sk className="h-5 w-20" />
              <Sk className="ml-auto h-7 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      <span className="sr-only">Memuat produk…</span>
    </div>
  );
}
