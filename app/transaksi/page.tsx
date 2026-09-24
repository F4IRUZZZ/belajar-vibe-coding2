import { getTransaksiPage, getTransaksiTotal, getProduk } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { TransaksiForm, TransaksiList } from "./_client";

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const jenis = tab === "masuk" || tab === "keluar" ? tab : undefined;
  const [{ rows, nextCursor }, total, produk] = await Promise.all([
    getTransaksiPage({ jenis, search: q }),
    getTransaksiTotal({ jenis, search: q }),
    getProduk(),
  ]);
  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="catat gaji mingguan, belanja, koreksi salah ketik"
      />
      <TransaksiForm produk={produk} />
      <TransaksiList
        initial={JSON.parse(JSON.stringify(rows))}
        initialCursor={nextCursor}
        total={total}
        tab={tab ?? "semua"}
        search={q ?? ""}
      />
    </div>
  );
}
