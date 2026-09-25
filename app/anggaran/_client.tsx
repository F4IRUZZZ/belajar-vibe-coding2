"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, PiggyBank, Plus, Trash2 } from "lucide-react";
import { hapusAnggaran, salinBulanLalu, upsertAnggaran } from "@/lib/actions/anggaran";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, EmptyState } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

type Item = {
  id: string;
  kategori: string;
  batas: number;
  terpakai: number;
  persen: number;
  status: "aman" | "waspada" | "bocor";
};

const badgeStatus = { aman: "ok", waspada: "warn", bocor: "bad" } as const;
const labelStatus = { aman: "aman", waspada: "waspada ≥80%", bocor: "bocor" } as const;

function bulanLalu(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  const d = new Date(th, bl - 2, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function AnggaranClient({
  bulan,
  item,
  tanpaAnggaran,
  kategoriExisting,
}: {
  bulan: string;
  item: Item[];
  tanpaAnggaran: { kategori: string; terpakai: number }[];
  kategoriExisting: string[];
}) {
  const router = useRouter();
  const [kategori, setKategori] = useState("");
  const [batasStr, setBatasStr] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [pending, start] = useTransition();

  const simpan = () =>
    start(async () => {
      setErr("");
      setInfo("");
      try {
        await upsertAnggaran({ kategori, batas: batasStr, bulan });
        setKategori("");
        setBatasStr("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });

  const salin = () =>
    start(async () => {
      setErr("");
      setInfo("");
      try {
        const n = await salinBulanLalu(bulanLalu(bulan), bulan);
        setInfo(`${n} anggaran disalin dari ${bulanLalu(bulan)}.`);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyalin");
      }
    });

  const hapus = (id: string, kat: string) => {
    if (!confirm(`Hapus anggaran ${kat}?`)) return;
    start(async () => {
      await hapusAnggaran(id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <form action="/anggaran" method="get" className="flex items-center gap-2">
          <Input
            type="month"
            name="bulan"
            defaultValue={bulan}
            aria-label="Pilih bulan"
            className="w-44"
          />
          <Button type="submit" variant="secondary" size="sm">Tampil</Button>
        </form>
        <Button onClick={salin} disabled={pending} variant="secondary" size="sm" className="ml-auto">
          <CopyPlus className="h-3.5 w-3.5" />
          Salin dari {bulanLalu(bulan)}
        </Button>
      </div>
      {info && <p role="status" className="mb-3 text-sm text-ok">{info}</p>}

      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kategori" htmlFor="ag-kategori">
              <Input
                id="ag-kategori"
                placeholder="Pangan"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                list="ag-kategori-existing"
              />
              <datalist id="ag-kategori-existing">
                {kategoriExisting.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </Field>
            <Field label="Batas per bulan (Rp)" htmlFor="ag-batas">
              <Input
                id="ag-batas"
                inputMode="numeric"
                placeholder="500000"
                value={batasStr ? formatRupiah(parseRupiah(batasStr)) : ""}
                onChange={(e) => setBatasStr(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
          </div>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <Button onClick={simpan} disabled={pending} className="w-full">
            <Plus className="h-4 w-4" />
            {pending ? "Menyimpan…" : `Simpan anggaran ${bulan}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Realisasi {bulan}
          </p>
          {item.length === 0 ? (
            <EmptyState
              icon={<PiggyBank className="h-5 w-5" />}
              title="Belum ada anggaran"
              hint="Tetapkan batas di atas, atau salin dari bulan lalu."
            />
          ) : (
            <div className="space-y-3">
              {item.map((a) => (
                <div key={a.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium">{a.kategori}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={badgeStatus[a.status]}>{labelStatus[a.status]}</Badge>
                      <span className="font-mono text-muted">
                        Rp{formatRupiah(a.terpakai)} / Rp{formatRupiah(a.batas)} ({a.persen}%)
                      </span>
                      <button
                        onClick={() => hapus(a.id, a.kategori)}
                        aria-label={`Hapus anggaran ${a.kategori}`}
                        className="rounded p-1 text-muted transition-colors hover:text-bad"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  <Progress value={Math.min(100, a.persen)} />
                </div>
              ))}
            </div>
          )}
          {tanpaAnggaran.length > 0 && (
            <div className="mt-4 border-t border-line/70 pt-3">
              <p className="mb-2 text-[13px] text-muted">Keluar tanpa anggaran (terpantau, tak dibatasi):</p>
              <div className="space-y-1.5">
                {tanpaAnggaran.map((t) => (
                  <div key={t.kategori} className="flex justify-between text-[13px]">
                    <span>{t.kategori}</span>
                    <span className="font-mono text-muted">Rp{formatRupiah(t.terpakai)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
