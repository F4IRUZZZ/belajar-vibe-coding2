"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { importTransaksiCsv } from "@/lib/actions/impor";
import { Button } from "@/components/ui/button";

export function CsvImpor() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasil, setHasil] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const kirim = (file: File) =>
    start(async () => {
      setHasil("");
      setErr("");
      try {
        const teks = await file.text();
        const r = await importTransaksiCsv(teks);
        setHasil(
          `${r.masuk} baris masuk${r.gagal > 0 ? `, ${r.gagal} gagal (${r.contohError.join("; ")})` : ""}.`,
        );
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal impor");
      }
      if (fileRef.current) fileRef.current.value = "";
    });

  return (
    <span className="shrink-0">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Pilih file CSV transaksi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) kirim(f);
        }}
      />
      <Button variant="secondary" disabled={pending} onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {pending ? "Mengimpor…" : "Impor CSV"}
      </Button>
      {hasil && <span role="status" className="ml-2 text-[12px] text-ok">{hasil}</span>}
      {err && <span role="alert" className="ml-2 text-[12px] text-bad">{err}</span>}
    </span>
  );
}
