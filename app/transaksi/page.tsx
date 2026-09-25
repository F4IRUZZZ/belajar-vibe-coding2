import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getTransaksiPage, getTransaksiTotal, getProduk, getTargets, getSampah } from "@/lib/store";
import { getDompetSaya } from "@/lib/actions/dompet";
import { PageHeader } from "@/components/ui/field";
import { TransaksiForm, TransaksiList, SampahList } from "./_client";

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const user = await ambilUser();
  if (!user) redirect("/login");
  if (tab === "sampah") {
    const sampah = await getSampah(user.id);
    return (
      <div>
        <PageHeader title="Transaksi" description="sampah 30 hari — pulihkan atau hapus permanen" />
        <SampahList initial={JSON.parse(JSON.stringify(sampah))} />
      </div>
    );
  }
  const jenis = tab === "masuk" || tab === "keluar" ? tab : undefined;
  const [{ rows, nextCursor }, total, produk, targets, dompets] = await Promise.all([
    getTransaksiPage({ userId: user.id, jenis, search: q }),
    getTransaksiTotal({ userId: user.id, jenis, search: q }),
    getProduk(),
    getTargets(user.id),
    getDompetSaya(),
  ]);
  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="catat gaji mingguan, belanja, koreksi salah ketik"
      />
      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20">
          <TransaksiForm produk={produk} targets={targets.map((t) => ({ id: t.id, nama: t.nama }))} dompets={dompets} />
        </div>
        <div className="min-w-0">
          <TransaksiList
            initial={JSON.parse(JSON.stringify(rows))}
            initialCursor={nextCursor}
            total={total}
            tab={tab ?? "semua"}
            search={q ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
