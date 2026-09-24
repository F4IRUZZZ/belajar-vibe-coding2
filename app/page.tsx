import Link from "next/link";
import { getSaldo, getRingkasanKategori, getGrafikHarian, type Periode } from "@/lib/store";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/field";
import { CashflowChart } from "@/components/cashflow-chart";
import {
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  Package,
  PlusCircle,
  Tags,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const periode: Periode = p === "minggu" || p === "bulan" ? p : "semua";
  const [saldo, kategori, harian] = await Promise.all([
    getSaldo(periode),
    getRingkasanKategori(periode),
    getGrafikHarian(),
  ]);
  const maxDonat = Math.max(1, ...kategori.map((k) => k.jumlah));

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-panel p-5 shadow-card">
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-irish-deep text-white">
            <Wallet className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Saldo · {periode === "semua" ? "Semua waktu" : periode === "minggu" ? "Minggu ini" : "Bulan ini"}
            </p>
            <h1 className={`mt-0.5 text-3xl font-semibold tracking-tight ${saldo.saldo < 0 ? "text-bad" : "text-ink"}`}>
              Rp{formatRupiah(saldo.saldo)}
            </h1>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="ok">
            <ArrowUpRight className="h-3 w-3" />
            Masuk Rp{formatRupiah(saldo.totalMasuk)}
          </Badge>
          <Badge variant="bad">
            <ArrowDownRight className="h-3 w-3" />
            Keluar Rp{formatRupiah(saldo.totalKeluar)}
          </Badge>
          <span className="ml-auto flex gap-1">
            {(["semua", "minggu", "bulan"] as Periode[]).map((x) => (
              <Link
                key={x}
                href={x === "semua" ? "/" : `/?p=${x}`}
                className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${periode === x ? "border-glow/40 bg-glow/15 text-irish-soft" : "border-line text-muted hover:text-ink"}`}
              >
                {x === "semua" ? "Semua" : x === "minggu" ? "Minggu" : "Bulan"}
              </Link>
            ))}
          </span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Keluar per kategori</p>
            {kategori.length === 0 ? (
              <EmptyState
                icon={<Tags className="h-5 w-5" />}
                title="Belum ada pengeluaran"
                hint="Catat transaksi pertama agar ringkasannya muncul di sini."
                action={
                  <Link href="/transaksi" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    Catat transaksi
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {kategori.map((k) => (
                  <div key={k.kategori}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>{k.kategori}</span>
                      <span className="font-mono text-muted">Rp{formatRupiah(k.jumlah)} ({k.persen}%)</span>
                    </div>
                    <Progress value={(k.jumlah / maxDonat) * 100} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <CashflowChart data={harian} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/transaksi", icon: PlusCircle, title: "Catat transaksi", desc: "Gaji, belanja, koreksi" },
          { href: "/hutang", icon: HandCoins, title: "Hutang / Piutang", desc: "Cicil + auto ke kas" },
          { href: "/produk", icon: Package, title: "Kelola produk", desc: "Beras, Sabun, …" },
        ].map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition-colors hover:border-muted">
              <CardContent className="p-4">
                <c.icon className="mb-2 h-5 w-5 text-irish" strokeWidth={2.1} />
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-muted">{c.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
