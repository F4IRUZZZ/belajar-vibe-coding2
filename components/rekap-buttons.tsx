"use client";
import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RekapButtons({ bulan }: { bulan: string }) {
  const [done, setDone] = useState<"salin" | null>(null);

  const ambil = async () => {
    const res = await fetch(`/api/rekap?bulan=${bulan}`);
    if (!res.ok) throw new Error("Gagal mengambil rekap");
    return res.text();
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(await ambil());
      setDone("salin");
      setTimeout(() => setDone(null), 2000);
    } catch {
      alert("Gagal menyalin rekap");
    }
  };

  const bagikan = async () => {
    const teks = await ambil().catch(() => null);
    if (!teks) {
      alert("Gagal mengambil rekap");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: teks });
      } catch {
        // dibatalkan pengguna, abaikan
      }
    } else {
      try {
        await navigator.clipboard.writeText(teks);
        setDone("salin");
        setTimeout(() => setDone(null), 2000);
      } catch {
        alert("Gagal membagikan rekap");
      }
    }
  };

  return (
    <span className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={salin} aria-label="Salin rekap untuk WA">
        {done === "salin" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {done === "salin" ? "Tersalin" : "Salin"}
      </Button>
      <Button variant="secondary" size="sm" onClick={bagikan} aria-label="Bagikan rekap">
        <Share2 className="h-3.5 w-3.5" />
        Bagikan
      </Button>
    </span>
  );
}
