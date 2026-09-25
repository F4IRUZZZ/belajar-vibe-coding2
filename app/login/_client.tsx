"use client";
import { useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  Chrome,
  Goal,
  HandCoins,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatRupiah } from "@/lib/format";

const BUKTI = [
  { icon: ShieldCheck, teks: "Tanpa password, masuk lewat akun Google." },
  { icon: Users, teks: "Satu akun dipakai rame-rame serumah." },
  { icon: Wallet, teks: "Data lama dengan email yang sama tersambung otomatis." },
];

const FITUR = [
  { icon: ArrowLeftRight, judul: "Transaksi harian", desc: "Pemasukan dan pengeluaran Rupiah lengkap dengan catatan." },
  { icon: HandCoins, judul: "Hutang piutang", desc: "Cicilan tercatat, kas berkurang sendiri saat lunas." },
  { icon: Goal, judul: "Target tabungan", desc: "Nabung bertahap, progres terisi dari pemasukan bertanda." },
  { icon: CalendarClock, judul: "Jadwal rutin", desc: "Gaji dan langganan tercatat sendiri tiap periodenya." },
  { icon: Share2, judul: "Rekap WA", desc: "Ringkasan bulan siap salin ke grup keluarga." },
];

export function LoginClient() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const masukGoogle = async () => {
    setErr("");
    setBusy(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghubungi Google");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid items-start gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="anim-enter" style={{ ["--d" as string]: "0ms" }}>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-irish-deep text-white">
            <Wallet className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Keuangan_Keluarga
          </p>
          <h1 className="mt-2 max-w-md text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Uang keluarga, tercatat jelas.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Satu tempat untuk pemasukan mingguan, belanja harian, hutang,
            dan tabungan. Dibuka di HP mana pun, datanya sama.
          </p>
          <ul className="mt-6 space-y-2.5">
            {BUKTI.map((b, i) => (
              <li
                key={b.teks}
                className="anim-enter flex items-center gap-2.5 text-[14px]"
                style={{ ["--d" as string]: `${120 + i * 90}ms` }}
              >
                <b.icon className="h-4 w-4 shrink-0 text-ok" strokeWidth={2.2} />
                <span>{b.teks}</span>
              </li>
            ))}
          </ul>

          <div
            className="anim-enter mt-8 max-w-md rounded-2xl border border-line bg-panel p-5 shadow-card"
            style={{ ["--d" as string]: "400ms" }}
            aria-label="Contoh tampilan saldo"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">
                Contoh saldo
              </p>
              <Badge variant="secondary">[CONTOH]</Badge>
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              Rp{formatRupiah(1250000)}
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="ok">Masuk Rp{formatRupiah(3000000)}</Badge>
              <Badge variant="bad">Keluar Rp{formatRupiah(1750000)}</Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              <div>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>Pangan</span>
                  <span className="font-mono text-muted">Rp{formatRupiah(800000)}</span>
                </div>
                <Progress value={80} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>Mandi</span>
                  <span className="font-mono text-muted">Rp{formatRupiah(200000)}</span>
                </div>
                <Progress value={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="anim-fade lg:sticky lg:top-6">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-6">
              <h2 className="text-xl font-semibold tracking-tight">
                Lanjut ke catatanmu
              </h2>
              {err && <p role="alert" className="text-sm text-bad">{err}</p>}
              <Button onClick={masukGoogle} disabled={busy} className="h-11 w-full text-[15px]">
                <Chrome className="h-5 w-5" />
                {busy ? "Membuka Google…" : "Masuk dengan Google"}
              </Button>
              <p className="text-[13px] leading-relaxed text-muted">
                Akun baru dibuat otomatis saat pertama masuk. Tidak ada
                iuran, tidak ada password untuk dihafal.
              </p>
              <div className="border-t border-line/70 pt-3">
                <p className="mb-2 text-[14px] font-semibold">
                  Mulai
                </p>
                <ol className="space-y-1.5 text-[14px]">
                  <li className="flex gap-2.5">
                    <span className="font-mono text-muted">1.</span>
                    <span>Masuk lewat tombol di atas.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-mono text-muted">2.</span>
                    <span>Catat transaksi pertama, misalnya gaji minggu ini.</span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-10 grid gap-x-8 gap-y-5 border-t border-line/70 pt-8 sm:grid-cols-2">
        {FITUR.map((f) => (
          <div key={f.judul} className="flex gap-3">
            <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-irish" strokeWidth={2.1} />
            <div>
              <div className="font-semibold">{f.judul}</div>
              <div className="mt-0.5 text-sm leading-relaxed text-muted">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
