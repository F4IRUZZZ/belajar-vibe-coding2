import { Card, CardContent } from "@/components/ui/card";
import { Sk } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-label="Memuat dashboard">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-line p-5" aria-hidden>
        <div className="flex items-center gap-3">
          <Sk className="h-11 w-11 rounded-xl" />
          <div className="flex-1">
            <Sk className="h-3 w-32" />
            <Sk className="mt-2 h-8 w-56" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Sk className="h-6 w-36" />
          <Sk className="h-6 w-36" />
          <Sk className="ml-auto h-6 w-44" />
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-2" aria-hidden>
        <Card>
          <CardContent className="space-y-3 p-4">
            <Sk className="h-3 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="mb-1.5 flex justify-between">
                  <Sk className="h-3.5 w-24" />
                  <Sk className="h-3.5 w-32" />
                </div>
                <Sk className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Sk className="mb-3 h-3 w-44" />
            <Sk className="h-48 w-full rounded-lg" />
            <Sk className="mt-2 h-3 w-52" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Sk className="mb-2 h-5 w-5" />
              <Sk className="h-4 w-32" />
              <Sk className="mt-1.5 h-3.5 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Memuat dashboard…</span>
    </div>
  );
}
