import { getTransaksi, getProduk } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { TransaksiForm, TransaksiList } from "./_client";

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const jenis = tab === "masuk" || tab === "keluar" ? tab : undefined;
  const [rows, produk] = await Promise.all([
    getTransaksi({ jenis, search: q }),
    getProduk(),
  ]);
  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="catat gaji mingguan, belanja, koreksi salah ketik"
      />
      <TransaksiForm produk={produk} />
      <TransaksiList initial={JSON.parse(JSON.stringify(rows))} tab={tab ?? "semua"} search={q ?? ""} />
    </div>
  );
}
