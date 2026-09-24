import { getAnggaranVsRealisasi, getKategoriExisting } from "@/lib/store";
import { bulanIni } from "@/lib/format";
import { PageHeader } from "@/components/ui/field";
import { AnggaranClient } from "./_client";

export default async function AnggaranPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { bulan } = await searchParams;
  const aktif = /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan ?? "") ? bulan! : bulanIni();
  const [data, kategori] = await Promise.all([
    getAnggaranVsRealisasi(aktif),
    getKategoriExisting(),
  ]);
  return (
    <div>
      <PageHeader
        title="Anggaran"
        description="batas belanja per kategori per bulan"
      />
      <AnggaranClient
        bulan={data.bulan}
        item={JSON.parse(JSON.stringify(data.item))}
        tanpaAnggaran={data.tanpaAnggaran}
        kategoriExisting={kategori}
      />
    </div>
  );
}
