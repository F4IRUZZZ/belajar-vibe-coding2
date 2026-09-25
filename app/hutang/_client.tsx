"use client";
import { Fragment, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Check, HandCoins, Wallet, X } from "lucide-react";
import { createHutang, bayarHutang, deleteHutang } from "@/lib/actions/hutang";
import { formatRupiah, todayLocal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/field";
import { ExpandableRow } from "@/components/ui/expand";
import { Table, TableHead, TableRow, TH, TD } from "@/components/ui/data-table";

type H = {
  id: string; arah: string; pihak: string; jumlah: number; dibayar: number;
  tanggal: string | Date; jatuhTempo: string | Date | null; keterangan: string | null; status: string;
};

function lewatTempo(h: H): boolean {
  if (h.status === "lunas" || !h.jatuhTempo) return false;
  return new Date(h.jatuhTempo) < new Date();
}

function Seksi({ title, rows, icon }: { title: string; rows: H[]; icon: "hutang" | "piutang" }) {
  const router = useRouter();
  const [bayarId, setBayarId] = useState<string | null>(null);
  const [nominal, setNominal] = useState("");
  const [pending, start] = useTransition();
  const subtotal = rows.reduce((a, h) => a + (h.jumlah - h.dibayar), 0);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            {icon === "hutang"
              ? <ArrowDownToLine className="h-4 w-4 text-bad" />
              : <ArrowUpFromLine className="h-4 w-4 text-ok" />}
            {title}
          </h2>
          <span className="font-mono text-[12px] text-muted">Sisa Rp{formatRupiah(subtotal)}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-5 w-5" />}
            title="Kosong"
            hint={`Belum ada ${title.toLowerCase()} tercatat.`}
          />
        ) : (
          <Table>
            <TableHead>
              <TH>Pihak</TH>
              <TH align="right">Jumlah</TH>
              <TH align="right">Sisa</TH>
              <TH>Status</TH>
              <TH align="right">Aksi</TH>
            </TableHead>
            <tbody>
              {rows.map((h, i) => (
                <Fragment key={h.id}>
                  <TableRow className="anim-enter" style={{ "--d": `${Math.min(i * 25, 250)}ms` } as CSSProperties}>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">
                        {h.pihak}
                        {lewatTempo(h) && <Badge variant="bad">lewat tempo</Badge>}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted">
                        {new Date(h.tanggal).toISOString().slice(0, 10)}
                        {h.jatuhTempo ? ` · tempo ${new Date(h.jatuhTempo).toISOString().slice(0, 10)}` : ""}
                        {h.keterangan ? ` · ${h.keterangan}` : ""}
                      </div>
                    </TD>
                    <TD align="right">Rp{formatRupiah(h.jumlah)}</TD>
                    <TD align="right" className="font-medium">Rp{formatRupiah(h.jumlah - h.dibayar)}</TD>
                    <TD><Badge variant={h.status === "lunas" ? "ok" : "warn"}>{h.status}</Badge></TD>
                    <TD align="right">
                      {h.status === "belum" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setBayarId(bayarId === h.id ? null : h.id)}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Bayar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { if (confirm(`Lunaskan ${h.pihak} Rp${formatRupiah(h.jumlah - h.dibayar)}?`)) start(async () => { await bayarHutang(h.id, String(h.jumlah - h.dibayar)); router.refresh(); }); }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Lunas
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={`Hapus ${h.pihak}`}
                            className="h-8 w-8 hover:border-bad/50 hover:text-bad"
                            onClick={() => { if (confirm(`Hapus ${h.pihak}?`)) start(async () => { try { await deleteHutang(h.id); router.refresh(); } catch (e) { alert(e instanceof Error ? e.message : "Gagal"); } }); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TD>
                  </TableRow>
                  <ExpandableRow open={bayarId === h.id} colSpan={5}>
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        aria-label="Nominal pembayaran"
                        placeholder={`Sisa Rp${formatRupiah(h.jumlah - h.dibayar)}`}
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                      />
                      <Button
                        disabled={pending}
                        onClick={() => start(async () => { try { await bayarHutang(h.id, nominal); setNominal(""); setBayarId(null); router.refresh(); } catch (e) { alert(e instanceof Error ? e.message : "Gagal"); } })}
                      >
                        Bayar
                      </Button>
                    </div>
                  </ExpandableRow>
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function HutangClient({ hutang, piutang }: { hutang: H[]; piutang: H[] }) {
  const router = useRouter();
  const [arah, setArah] = useState<"hutang" | "piutang">("hutang");
  const [pihak, setPihak] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(todayLocal());
  const [tempo, setTempo] = useState("");
  const [ket, setKet] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setErr("");
      try {
        await createHutang({ arah, pihak, jumlah, tanggal, jatuhTempo: tempo || undefined, keterangan: ket || undefined });
        setPihak(""); setJumlah(""); setTempo(""); setKet("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal");
      }
    });

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <SegmentedControl
            id="hutang-arah"
            ariaLabel="Arah pencatatan"
            value={arah}
            onChange={setArah}
            options={[
              { value: "hutang", label: "Hutang (pinjam)", icon: ArrowDownToLine },
              { value: "piutang", label: "Piutang (dipinjam)", icon: ArrowUpFromLine },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pihak" htmlFor="hu-pihak">
              <Input id="hu-pihak" placeholder="Budi" value={pihak} onChange={(e) => setPihak(e.target.value)} />
            </Field>
            <Field label="Jumlah Rp" htmlFor="hu-jumlah">
              <Input
                id="hu-jumlah"
                inputMode="numeric"
                placeholder="50000"
                value={jumlah ? formatRupiah(Number(jumlah.replace(/[^0-9]/g, "")) || 0) : ""}
                onChange={(e) => setJumlah(e.target.value)}
              />
            </Field>
            <Field label="Tanggal" htmlFor="hu-tanggal">
              <Input id="hu-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </Field>
            <Field label="Jatuh tempo (opsional)" htmlFor="hu-tempo">
              <Input id="hu-tempo" type="date" value={tempo} onChange={(e) => setTempo(e.target.value)} />
            </Field>
          </div>
          <Field label="Keterangan (opsional)" htmlFor="hu-ket">
            <Input id="hu-ket" placeholder="…" value={ket} onChange={(e) => setKet(e.target.value)} />
          </Field>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </CardContent>
      </Card>
      <Seksi title="Hutang" rows={hutang} icon="hutang" />
      <Seksi title="Piutang" rows={piutang} icon="piutang" />
    </div>
  );
}
