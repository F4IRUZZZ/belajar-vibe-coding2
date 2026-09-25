"use client";
import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { createProduk, updateProduk, deleteProduk } from "@/lib/actions/produk";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableHead, TableRow, TH, TD } from "@/components/ui/data-table";

type P = { id: string; nama: string; kategori: string };
type Tren = { terakhir: number; persen: number | null; riwayat: number[] };

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 64;
  const h = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(" ");
  const naik = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="mt-1 block">
      <polyline points={pts} fill="none" stroke={naik ? "var(--color-bad)" : "var(--color-ok)"} strokeWidth="1.5" />
    </svg>
  );
}

export function ProdukClient({
  initial,
  kategoriExisting,
  tren,
}: {
  initial: P[];
  kategoriExisting: string[];
  tren: Record<string, Tren>;
}) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const defaults = ["Pangan", "Mandi", "Lainnya"];
  const opsi = [...new Set([...defaults, ...kategoriExisting])];

  const simpan = () =>
    start(async () => {
      setErr("");
      try {
        if (editId) {
          await updateProduk(editId, { nama, kategori });
          setEditId(null);
        } else {
          await createProduk({ nama, kategori });
        }
        setNama(""); setKategori("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal");
      }
    });

  const batal = () => {
    setEditId(null);
    setNama("");
    setKategori("");
    setErr("");
  };

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama produk" htmlFor="pr-nama">
              <Input
                id="pr-nama"
                placeholder="Beras"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </Field>
            <Field label="Kategori" htmlFor="pr-kategori" hint="Pilih saran atau tulis baru">
              <Combobox
                id="pr-kategori"
                ariaLabel="Kategori produk"
                placeholder="Pangan"
                value={kategori}
                onChange={setKategori}
                suggestions={opsi}
              />
            </Field>
          </div>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <Button onClick={simpan} disabled={pending} className="flex-1">
              {pending ? "Menyimpan…" : editId ? "Simpan perubahan" : "Tambah produk"}
            </Button>
            {editId && (
              <Button variant="secondary" onClick={batal}>
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          {initial.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="Belum ada produk"
              hint="Tambahkan lewat form di atas agar mudah dipilih saat mencatat."
            />
          ) : (
            <Table>
              <TableHead>
                <TH>No</TH>
                <TH>Nama</TH>
                <TH>Kategori</TH>
                <TH align="right">Terakhir</TH>
                <TH align="right">Aksi</TH>
              </TableHead>
              <tbody>
                {initial.map((p, i) => {
                  const t = tren[p.id];
                  return (
                  <TableRow key={p.id} className="anim-enter" style={{ "--d": `${Math.min(i * 25, 250)}ms` } as CSSProperties}>
                    <TD mono className="text-muted">{i + 1}</TD>
                    <TD className="font-medium">{p.nama}</TD>
                    <TD>{p.kategori}</TD>
                    <TD align="right">
                      {t ? (
                        <span className="inline-block text-right">
                          <span className="flex items-center justify-end gap-1.5 font-mono">
                            Rp{formatRupiah(t.terakhir)}
                            {t.persen == null ? (
                              <Badge variant="outline"><Minus className="h-3 w-3" />baru</Badge>
                            ) : t.persen > 0 ? (
                              <Badge variant="bad"><TrendingUp className="h-3 w-3" />{t.persen}%</Badge>
                            ) : t.persen < 0 ? (
                              <Badge variant="ok"><TrendingDown className="h-3 w-3" />{t.persen}%</Badge>
                            ) : (
                              <Badge variant="outline">stabil</Badge>
                            )}
                          </span>
                          <Spark data={t.riwayat} />
                        </span>
                      ) : (
                        <span className="font-mono text-muted">—</span>
                      )}
                    </TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setEditId(p.id); setNama(p.nama); setKategori(p.kategori); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="hover:border-bad/50 hover:text-bad"
                          onClick={() => { if (confirm(`Hapus ${p.nama}?`)) start(async () => { await deleteProduk(p.id); router.refresh(); }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </TD>
                  </TableRow>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
