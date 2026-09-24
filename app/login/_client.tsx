"use client";
import { useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  Chrome,
  Goal,
  HandCoins,
  PiggyBank,
  Share2,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FITUR = [
  { icon: ArrowLeftRight, judul: "Transaksi harian", desc: "Pemasukan dan pengeluaran dalam Rupiah, lengkap dengan catatan." },
  { icon: PiggyBank, judul: "Anggaran kategori", desc: "Batas belanja per bulan, dengan peringatan saat bocor." },
  { icon: HandCoins, judul: "Hutang piutang", desc: "Cicilan tercatat dan otomatis mengurangi kas saat lunas." },
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 mt-6 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-irish-deep text-white">
          <Wallet className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Keuangan_Keluarga
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Uang keluarga, tercatat jelas.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          Catat pemasukan dan pengeluaran harian, pantau anggaran tiap kategori,
          kelola hutang, dan bagikan rekap ke grup keluarga.
        </p>
      </div>

      <Card className="mx-auto mb-10 max-w-md">
        <CardContent className="space-y-3 p-5">
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <Button onClick={masukGoogle} disabled={busy} className="h-11 w-full text-[15px]">
            <Chrome className="h-5 w-5" />
            {busy ? "Membuka Google…" : "Masuk dengan Google"}
          </Button>
          <p className="text-center text-[13px] leading-relaxed text-muted">
            Satu akun Google bisa dipakai rame-rame serumah. Tanpa password,
            data lama dengan email yang sama tersambung otomatis.
          </p>
        </CardContent>
      </Card>

      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FITUR.map((f) => (
          <Card key={f.judul}>
            <CardContent className="p-4">
              <f.icon className="mb-2 h-5 w-5 text-irish" strokeWidth={2.1} />
              <div className="font-semibold">{f.judul}</div>
              <div className="mt-0.5 text-sm leading-relaxed text-muted">{f.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-line bg-panel p-5">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Mulai
        </p>
        <ol className="space-y-2 text-[15px]">
          <li className="flex gap-3">
            <span className="font-mono text-muted">1.</span>
            <span>Masuk dengan akun Google lewat tombol di atas.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-muted">2.</span>
            <span>Catat transaksi pertama, misalnya gaji minggu ini.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
