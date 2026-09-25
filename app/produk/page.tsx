import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getProduk, getKategoriExisting, getTrenHarga } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { ProdukClient } from "./_client";

export default async function ProdukPage() {
  const user = await ambilUser();
  if (!user) redirect("/login");
  const [rows, kat, tren] = await Promise.all([getProduk(), getKategoriExisting(), getTrenHarga(user.id)]);
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
