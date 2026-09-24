import { getProduk, getKategoriExisting, getTrenHarga } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { ProdukClient } from "./_client";

export default async function ProdukPage() {
  const [rows, kat, tren] = await Promise.all([getProduk(), getKategoriExisting(), getTrenHarga()]);
  return (
    <div>
      <PageHeader
        title="Produk"
        description="master data agar form transaksi tinggal pilih"
      />
      <ProdukClient initial={rows} kategoriExisting={kat} tren={tren} />
    </div>
  );
}
