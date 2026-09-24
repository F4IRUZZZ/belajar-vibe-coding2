"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Goal, Pencil, Plus, Trash2 } from "lucide-react";
import { createTarget, deleteTarget, updateTarget } from "@/lib/actions/target";
import { formatRupiah, formatTanggalId, parseRupiah, todayLocal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, EmptyState } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type T = {
  id: string;
  nama: string;
  target: number;
  terkumpul: number;
  persen: number;
  deadline: string | Date | null;
};

export function TargetClient({ initial }: { initial: T[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const simpan = () =>
    start(async () => {
      setErr("");
      try {
        const input = { nama, target: targetStr, deadline: deadline || undefined };
        if (editId) {
          await updateTarget(editId, input);
          setEditId(null);
        } else {
          await createTarget(input);
        }
        setNama("");
        setTargetStr("");
        setDeadline("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });

  const hapus = (id: string, nama: string) => {
    if (!confirm(`Hapus target ${nama}? Pemasukan bertanda jadi tak bertanda.`)) return;
    start(async () => {
      await deleteTarget(id);
      router.refresh();
    });
  };

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nama target" htmlFor="tg-nama">
              <Input id="tg-nama" placeholder="DP motor" value={nama} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field label="Nominal (Rp)" htmlFor="tg-nominal">
              <Input
                id="tg-nominal"
                inputMode="numeric"
                placeholder="5000000"
                value={targetStr ? formatRupiah(parseRupiah(targetStr)) : ""}
                onChange={(e) => setTargetStr(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
            <Field label="Deadline (opsional)" htmlFor="tg-deadline">
              <Input id="tg-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </div>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <div className="flex gap-2">
            <Button onClick={simpan} disabled={pending} className="flex-1">
              <Plus className="h-4 w-4" />
              {pending ? "Menyimpan…" : editId ? "Simpan perubahan" : "Buat target"}
            </Button>
            {editId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setNama("");
                  setTargetStr("");
                  setDeadline("");
                  setErr("");
                }}
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {initial.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={<Goal className="h-5 w-5" />}
              title="Belum ada target"
              hint="Buat target di atas, lalu tandai pemasukan ke target itu saat mencatat."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold">{t.nama}</span>
                  <Badge variant={t.persen >= 100 ? "ok" : t.persen >= 50 ? "warn" : "secondary"}>
                    {t.persen}%
                  </Badge>
                </div>
                <p className="mb-2 font-mono text-[12px] text-muted">
                  Rp{formatRupiah(t.terkumpul)} / Rp{formatRupiah(t.target)}
                  {t.deadline ? ` · sampai ${formatTanggalId(t.deadline)}` : ""}
                </p>
                <Progress value={Math.min(100, t.persen)} />
                <div className="mt-3 flex gap-1">
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setNama(t.nama);
                      setTargetStr(String(t.target));
                      setDeadline(t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : todayLocal());
                    }}
                    aria-label={`Ubah target ${t.nama}`}
                    className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-muted hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => hapus(t.id, t.nama)}
                    aria-label={`Hapus target ${t.nama}`}
                    className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-bad/50 hover:text-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href="/transaksi"
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "ml-auto")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nabung
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
