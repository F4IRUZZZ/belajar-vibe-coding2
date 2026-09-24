import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getTransaksiPage, getTransaksiTotal, getProduk, getTargets } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { TransaksiForm, TransaksiList } from "./_client";

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const user = await ambilUser();
  if (!user) redirect("/login");
  const jenis = tab === "masuk" || tab === "keluar" ? tab : undefined;
  const [{ rows, nextCursor }, total, produk, targets] = await Promise.all([
    getTransaksiPage({ userId: user.id, jenis, search: q }),
    getTransaksiTotal({ userId: user.id, jenis, search: q }),
    getProduk(),
    getTargets(user.id),
  ]);
  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="catat gaji mingguan, belanja, koreksi salah ketik"
      />
      <TransaksiForm produk={produk} targets={targets.map((t) => ({ id: t.id, nama: t.nama }))} />
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
