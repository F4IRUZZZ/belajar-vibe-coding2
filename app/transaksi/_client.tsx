"use client";
import { Fragment, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, MessageSquarePlus, Pencil, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import { createTransaksi, deleteTransaksi, listTransaksiPage, getHargaTerakhir, pulihkanTransaksi, hapusPermanen, addCatatan, deleteCatatan } from "@/lib/actions/transaksi";
import { formatRupiah, formatTanggalId, parseRupiah, todayLocal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/field";
import { Expand, ExpandableRow } from "@/components/ui/expand";
import { Table, TableHead, TableRow, TH, TD } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

type Produk = { id: string; nama: string; kategori: string };
type Cat = { id: string; isi: string };
type Tx = {
  id: string; jenis: string; jumlah: number; tanggal: string | Date; kategori: string;
  produk: Produk | null; catatan: Cat[];
};

export function TransaksiForm({ produk, targets, dompets }: { produk: Produk[]; targets: { id: string; nama: string }[]; dompets: { id: string; nama: string }[] }) {
  const router = useRouter();
  const [jenis, setJenis] = useState<"masuk" | "keluar">("keluar");
  const [jumlahStr, setJumlahStr] = useState("");
  const [tanggal, setTanggal] = useState(todayLocal());
  const [produkId, setProdukId] = useState("");
  const [kategoriBebas, setKategoriBebas] = useState("");
  const [catatan, setCatatan] = useState("");
  const [targetId, setTargetId] = useState("");
  const [dompetId, setDompetId] = useState("");
  const [hargaStr, setHargaStr] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const showKategori = jenis === "masuk" || produkId === "__bebas" || (jenis === "keluar" && !produkId);
  const showHarga = jenis === "keluar" && !!produk.find((x) => x.id === produkId);

  const pilihProduk = (id: string) => {
    setProdukId(id);
    setHargaStr("");
    const prod = produk.find((x) => x.id === id);
    if (prod) {
      start(async () => {
        const h = await getHargaTerakhir(prod.id);
        if (h != null) setHargaStr(String(h));
      });
    }
  };

  const submit = () =>
    start(async () => {
      setErr("");
      try {
        const prod = produk.find((x) => x.id === produkId);
        let kategori = "";
        if (jenis === "keluar" && prod) kategori = prod.kategori;
        else kategori = kategoriBebas.trim() || (jenis === "masuk" ? "Lainnya" : "Lainnya");
        if (jenis === "keluar" && produkId === "__bebas") kategori = kategoriBebas.trim();
        await createTransaksi({
          jenis,
          jumlah: jumlahStr,
          tanggal,
          kategori,
          produkId: prod ? prod.id : undefined,
          hargaSatuan: showHarga && hargaStr ? hargaStr : undefined,
          targetId: jenis === "masuk" && targetId ? targetId : undefined,
          dompetId: dompetId || undefined,
          catatan: catatan || undefined,
        });
        setJumlahStr(""); setCatatan(""); setKategoriBebas(""); setProdukId(""); setHargaStr(""); setTargetId(""); setDompetId("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });

  return (
    <Card className="mb-4">
      <CardContent className="space-y-3 p-4">
        <SegmentedControl
          id="tx-jenis"
          ariaLabel="Jenis transaksi"
          value={jenis}
          onChange={setJenis}
          options={[
            { value: "masuk", label: "Masuk", icon: ArrowUpRight },
            { value: "keluar", label: "Keluar", icon: ArrowDownRight },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jumlah (Rp)" htmlFor="tx-jumlah">
            <Input
              id="tx-jumlah"
              inputMode="numeric"
              placeholder="50000"
              value={jumlahStr ? formatRupiah(parseRupiah(jumlahStr)) : ""}
              onChange={(e) => setJumlahStr(e.target.value)}
            />
          </Field>
          <Field label="Tanggal" htmlFor="tx-tanggal">
            <Input id="tx-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
        </div>
        <Expand open={jenis === "keluar"}>
          <Field label="Produk" htmlFor="tx-produk">
            <Select
              id="tx-produk"
              ariaLabel="Produk"
              placeholder="Pilih produk…"
              value={produkId}
              onChange={pilihProduk}
              options={[
                ...produk.map((p) => ({ value: p.id, label: `${p.nama} (${p.kategori})` })),
                { value: "__bebas", label: "Tulis sendiri…" },
              ]}
            />
          </Field>
        </Expand>
        <Expand open={showHarga}>
          <Field label="Harga satuan (Rp, opsional)" htmlFor="tx-harga" hint="Terisi otomatis dari pembelian terakhir, bisa diubah">
            <Input
              id="tx-harga"
              inputMode="numeric"
              placeholder="cth: 12000"
              value={hargaStr ? formatRupiah(parseRupiah(hargaStr)) : ""}
              onChange={(e) => setHargaStr(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
        </Expand>
        <Expand open={jenis === "masuk" && targets.length > 0}>
          <Field label="Tandai ke target (opsional)" htmlFor="tx-target">
            <Select
              id="tx-target"
              ariaLabel="Target tabungan"
              placeholder="Tanpa target…"
              value={targetId}
              onChange={setTargetId}
              options={targets.map((t) => ({ value: t.id, label: t.nama }))}
            />
          </Field>
        </Expand>
        {dompets.length > 1 && (
          <Field label="Dompet" htmlFor="tx-dompet">
            <Select
              id="tx-dompet"
              ariaLabel="Dompet"
              placeholder="Kas (bawaan)"
              value={dompetId}
              onChange={setDompetId}
              options={dompets.map((d) => ({ value: d.id, label: d.nama }))}
            />
          </Field>
        )}
        <Expand open={showKategori}>
          <Field label="Kategori" htmlFor="tx-kategori">
            <Input
              id="tx-kategori"
              placeholder={jenis === "masuk" ? "Gajian" : "Pangan"}
              value={kategoriBebas}
              onChange={(e) => setKategoriBebas(e.target.value)}
            />
          </Field>
        </Expand>
        <Field label="Catatan (opsional)" htmlFor="tx-catatan">
          <Input
            id="tx-catatan"
            placeholder="cth: belanja warung"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </Field>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <Button onClick={submit} disabled={pending} className="w-full">
          {pending ? "Menyimpan…" : "Simpan transaksi"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TransaksiList({
  initial,
  initialCursor,
  total,
  tab,
  search,
}: {
  initial: Tx[];
  initialCursor: string | null;
  total: { masuk: number; keluar: number };
  tab: string;
  search: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Tx[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [catInput, setCatInput] = useState("");

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSel((s) => (s.length === rows.length ? [] : rows.map((t) => t.id)));
  const hapus = (ids: string[]) => {
    if (!confirm(`Hapus ${ids.length} transaksi?`)) return;
    start(async () => {
      await deleteTransaksi(ids);
      setSel([]);
      router.refresh();
    });
  };
  const muatLagi = () => {
    if (!cursor) return;
    start(async () => {
      const page = await listTransaksiPage({
        jenis: tab === "masuk" || tab === "keluar" ? tab : undefined,
        search: search || undefined,
        cursor,
      });
      setRows((r) => [...r, ...page.rows]);
      setCursor(page.nextCursor);
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form className="mb-3 flex flex-wrap items-center gap-2" action="/transaksi" method="get">
          {(["semua", "masuk", "keluar", "sampah"] as const).map((t) => (
            <button
              key={t}
              name="tab"
              value={t}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors",
                tab === t || (t === "semua" && !tab)
                  ? "border-glow/40 bg-glow/10 text-glow"
                  : "border-line text-muted hover:text-ink",
              )}
            >
              {t === "semua" ? "Semua" : t === "masuk" ? "Masuk" : t === "keluar" ? "Keluar" : "Sampah"}
            </button>
          ))}
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Cari kategori, catatan, tanggal…"
              aria-label="Cari transaksi"
              className="h-8 w-full rounded-md border border-line bg-transparent pr-3 pl-8 text-sm outline-none placeholder:text-muted focus:border-muted"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Cari</Button>
        </form>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-muted">
          <span>Masuk Rp{formatRupiah(total.masuk)}</span>
          <span aria-hidden>·</span>
          <span>Keluar Rp{formatRupiah(total.keluar)}</span>
          <span aria-hidden>·</span>
          <span>Selisih Rp{formatRupiah(total.masuk - total.keluar)}</span>
          {sel.length > 0 && (
            <Button
              onClick={() => hapus(sel)}
              disabled={pending}
              variant="secondary"
              size="sm"
              className="ml-auto border-bad/40 text-bad hover:border-bad hover:text-bad"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus {sel.length} terpilih
            </Button>
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquarePlus className="h-5 w-5" />}
            title="Belum ada transaksi"
            hint="Catat lewat form di atas untuk mulai."
          />
        ) : (
          <Table>
            <TableHead>
              <TH>
                <input
                  type="checkbox"
                  checked={sel.length === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  aria-label="Pilih semua"
                  className="h-3.5 w-3.5 accent-[#059669]"
                />
              </TH>
              <TH>Tanggal</TH>
              <TH className="hidden sm:table-cell">Jenis</TH>
              <TH align="right">Jumlah</TH>
              <TH>Kategori</TH>
              <TH align="right">Aksi</TH>
            </TableHead>
            <tbody>
              {rows.map((t, i) => (
                <Fragment key={t.id}>
                  <TableRow className="anim-enter" style={{ "--d": `${Math.min(i * 25, 250)}ms` } as CSSProperties}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={sel.includes(t.id)}
                        onChange={() => toggle(t.id)}
                        aria-label={`Pilih transaksi ${t.kategori}`}
                        className="h-3.5 w-3.5 accent-[#059669]"
                      />
                    </TD>
                    <TD mono>{new Date(t.tanggal).toISOString().slice(0, 10)}</TD>
                    <TD className="hidden sm:table-cell"><Badge variant={t.jenis === "masuk" ? "ok" : "bad"}>{t.jenis}</Badge></TD>
                    <TD align="right" className="font-medium">Rp{formatRupiah(t.jumlah)}</TD>
                    <TD>{t.kategori}{t.produk ? <span className="text-muted"> · {t.produk.nama}</span> : null}</TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setOpenCat(openCat === t.id ? null : t.id)}
                          aria-label={`Catatan transaksi ${t.kategori}`}
                          title="Catatan"
                          className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-muted hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => hapus([t.id])}
                          aria-label={`Hapus transaksi ${t.kategori}`}
                          title="Hapus"
                          className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-bad/50 hover:text-bad"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TD>
                  </TableRow>
                  <ExpandableRow open={openCat === t.id} colSpan={6}>
                    {t.catatan.map((c) => (
                      <div key={c.id} className="mb-1 flex items-center gap-2 text-[13px]">
                        <span className="flex-1">• {c.isi}</span>
                        <button
                          onClick={() => start(async () => { await deleteCatatan(c.id); router.refresh(); })}
                          aria-label={`Hapus catatan ${c.isi}`}
                          className="rounded p-1 text-muted transition-colors hover:text-bad"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {t.catatan.length === 0 && (
                      <p className="mb-1 text-[13px] text-muted">Belum ada catatan.</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Tambah catatan…"
                        aria-label="Isi catatan baru"
                        value={catInput}
                        onChange={(e) => setCatInput(e.target.value)}
                      />
                      <Button
                        size="icon"
                        aria-label="Simpan catatan"
                        onClick={() => start(async () => { if (catInput.trim()) { await addCatatan(t.id, catInput); setCatInput(""); router.refresh(); } })}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </ExpandableRow>
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
        {cursor && (
          <div className="mt-3 flex justify-center">
            <Button onClick={muatLagi} disabled={pending} variant="secondary" size="sm">
              {pending ? "Memuat…" : `Muat lagi (${rows.length} tampil)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SampahList({ initial }: { initial: Tx[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const pulihkan = (ids: string[]) => {
    start(async () => {
      await pulihkanTransaksi(ids);
      setSel([]);
      router.refresh();
    });
  };

  const musnah = (ids: string[]) => {
    if (!confirm(`Hapus permanen ${ids.length} transaksi? Tidak bisa dibatalkan.`)) return;
    start(async () => {
      await hapusPermanen(ids);
      setSel([]);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href="/transaksi" className="font-mono text-[11px] text-irish-soft hover:text-ink">
            ← Kembali
          </Link>
          {sel.length > 0 && (
            <span className="ml-auto flex gap-1">
              <Button onClick={() => pulihkan(sel)} disabled={pending} variant="secondary" size="sm">
                <Undo2 className="h-3.5 w-3.5" />
                Pulihkan {sel.length}
              </Button>
              <Button
                onClick={() => musnah(sel)}
                disabled={pending}
                variant="secondary"
                size="sm"
                className="border-bad/40 text-bad hover:border-bad hover:text-bad"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Permanen
              </Button>
            </span>
          )}
        </div>
        {initial.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="h-5 w-5" />}
            title="Sampah kosong"
            hint="Transaksi yang dihapus singgah di sini 30 hari sebelum musnah otomatis."
          />
        ) : (
          <Table>
            <TableHead>
              <TH>
                <input
                  type="checkbox"
                  checked={sel.length === initial.length}
                  onChange={() => setSel((s) => (s.length === initial.length ? [] : initial.map((t) => t.id)))}
                  aria-label="Pilih semua"
                  className="h-3.5 w-3.5 accent-[#059669]"
                />
              </TH>
              <TH>Dihapus</TH>
              <TH>Tanggal</TH>
              <TH>Kategori</TH>
              <TH align="right">Jumlah</TH>
              <TH align="right">Aksi</TH>
            </TableHead>
            <tbody>
              {initial.map((t: Tx & { deletedAt?: string | Date }) => (
                <TableRow key={t.id}>
                  <TD>
                    <input
                      type="checkbox"
                      checked={sel.includes(t.id)}
                      onChange={() => toggle(t.id)}
                      aria-label={`Pilih ${t.kategori}`}
                      className="h-3.5 w-3.5 accent-[#059669]"
                    />
                  </TD>
                  <TD mono>{t.deletedAt ? formatTanggalId(t.deletedAt) : "—"}</TD>
                  <TD mono>{new Date(t.tanggal).toISOString().slice(0, 10)}</TD>
                  <TD>{t.kategori}</TD>
                  <TD align="right" className="font-medium">Rp{formatRupiah(t.jumlah)}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => pulihkan([t.id])}
                        aria-label={`Pulihkan ${t.kategori}`}
                        title="Pulihkan"
                        className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-muted hover:text-ink"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => musnah([t.id])}
                        aria-label={`Hapus permanen ${t.kategori}`}
                        title="Hapus permanen"
                        className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-bad/50 hover:text-bad"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TD>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
