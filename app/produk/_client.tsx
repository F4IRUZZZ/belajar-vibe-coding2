"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Trash2 } from "lucide-react";
import { createProduk, updateProduk, deleteProduk } from "@/lib/actions/produk";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableHead, TableRow, TH, TD } from "@/components/ui/data-table";

type P = { id: string; nama: string; kategori: string };

export function ProdukClient({ initial, kategoriExisting }: { initial: P[]; kategoriExisting: string[] }) {
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
                <TH align="right">Aksi</TH>
              </TableHead>
              <tbody>
                {initial.map((p, i) => (
                  <TableRow key={p.id}>
                    <TD mono className="text-muted">{i + 1}</TD>
                    <TD className="font-medium">{p.nama}</TD>
                    <TD>{p.kategori}</TD>
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
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
