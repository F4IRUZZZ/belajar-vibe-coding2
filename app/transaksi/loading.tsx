import { FormCardSkeleton, PageHeadSkeleton, TableCardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-label="Memuat transaksi">
      <div className="mb-4">
        <PageHeadSkeleton />
      </div>
      <FormCardSkeleton fields={2} />
      <TableCardSkeleton rows={6} />
      <span className="sr-only">Memuat transaksi…</span>
    </div>
  );
}
