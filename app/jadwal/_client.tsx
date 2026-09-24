"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Play, Plus, Trash2 } from "lucide-react";
import { createJadwal, deleteJadwal, jalankanJadwal, toggleJadwal } from "@/lib/actions/jadwal";
import { formatRupiah, formatTanggalId, todayLocal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, EmptyState } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented";
import { Table, TableHead, TableRow, TH, TD } from "@/components/ui/data-table";

type J = {
  id: string;
  frekuensi: string;
  jenis: string;
  jumlah: number;
  kategori: string;
  catatan: string | null;
  nextRun: string | Date;
  aktif: boolean;
};

export function JadwalClient({ initial }: { initial: J[] }) {
  const router = useRouter();
  const [jenis, setJenis] = useState<"masuk" | "keluar">("masuk");
  const [frekuensi, setFrekuensi] = useState("mingguan");
  const [jumlahStr, setJumlahStr] = useState("");
  const [kategori, setKategori] = useState("");
  const [mulai, setMulai] = useState(todayLocal());
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [pending, start] = useTransition();

  const simpan = () =>
    start(async () => {
      setErr("");
      setInfo("");
      try {
        await createJadwal({
          frekuensi: frekuensi === "bulanan" ? "bulanan" : "mingguan",
          jenis,
          jumlah: jumlahStr,
          kategori,
          mulai,
        });
        setJumlahStr("");
        setKategori("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });

  const jalan = () =>
    start(async () => {
      setErr("");
      setInfo("");
      const n = await jalankanJadwal();
      setInfo(n === 0 ? "Tidak ada yang jatuh tempo." : `${n} transaksi rutin tercatat.`);
      router.refresh();
    });

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-3">
            <SegmentedControl
              id="jd-jenis"
              ariaLabel="Jenis"
              value={jenis}
              onChange={setJenis}
              options={[
                { value: "masuk", label: "Masuk", icon: ArrowUpRight },
                { value: "keluar", label: "Keluar", icon: ArrowDownRight },
              ]}
            />
            <SegmentedControl
              id="jd-frek"
              ariaLabel="Frekuensi"
              value={frekuensi}
              onChange={setFrekuensi}
              options={[
                { value: "mingguan", label: "Mingguan" },
                { value: "bulanan", label: "Bulanan" },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Jumlah (Rp)" htmlFor="jd-jumlah">
              <Input
                id="jd-jumlah"
                inputMode="numeric"
                placeholder="300000"
                value={jumlahStr ? formatRupiah(parseInt(jumlahStr.replace(/[^0-9]/g, "") || "0", 10)) : ""}
                onChange={(e) => setJumlahStr(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
            <Field label="Kategori" htmlFor="jd-kategori">
              <Input id="jd-kategori" placeholder="Gajian" value={kategori} onChange={(e) => setKategori(e.target.value)} />
            </Field>
            <Field label="Mulai" htmlFor="jd-mulai">
              <Input id="jd-mulai" type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} />
            </Field>
          </div>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <Button onClick={simpan} disabled={pending} className="w-full">
            <Plus className="h-4 w-4" />
            {pending ? "Menyimpan…" : "Tambah jadwal"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Jadwal aktif</p>
            <Button variant="secondary" size="sm" onClick={jalan} disabled={pending}>
              <Play className="h-3.5 w-3.5" />
              Jalankan sekarang
            </Button>
          </div>
          {info && <p role="status" className="mb-3 text-sm text-ok">{info}</p>}
          {initial.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="Belum ada jadwal"
              hint="Contoh: gaji tiap Senin, listrik tiap tanggal 20."
            />
          ) : (
            <Table>
              <TableHead>
                <TH>Jadwal</TH>
                <TH align="right">Jumlah</TH>
                <TH>Berikutnya</TH>
                <TH>Status</TH>
                <TH align="right">Aksi</TH>
              </TableHead>
              <tbody>
                {initial.map((j) => (
                  <TableRow key={j.id}>
                    <TD>
                      <span className="font-medium">{j.kategori}</span>
                      <span className="font-mono text-[11px] text-muted"> · {j.jenis} {j.frekuensi}</span>
                    </TD>
                    <TD align="right" className="font-medium">Rp{formatRupiah(j.jumlah)}</TD>
                    <TD mono>{formatTanggalId(j.nextRun)}</TD>
                    <TD>
                      <button
                        onClick={() => start(async () => { await toggleJadwal(j.id, !j.aktif); router.refresh(); })}
                        aria-label={`${j.aktif ? "Nonaktifkan" : "Aktifkan"} ${j.kategori}`}
                      >
                        <Badge variant={j.aktif ? "ok" : "outline"}>{j.aktif ? "aktif" : "mati"}</Badge>
                      </button>
                    </TD>
                    <TD align="right">
                      <button
                        onClick={() => { if (confirm(`Hapus jadwal ${j.kategori}?`)) start(async () => { await deleteJadwal(j.id); router.refresh(); }); }}
                        aria-label={`Hapus jadwal ${j.kategori}`}
                        className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-bad/50 hover:text-bad"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TD>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
