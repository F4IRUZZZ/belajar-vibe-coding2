"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { createDompet, deleteDompet, renameDompet } from "@/lib/actions/dompet";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function DompetManager({ initial }: { initial: { id: string; nama: string }[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const simpan = () =>
    start(async () => {
      setErr("");
      try {
        if (editId) {
          await renameDompet(editId, nama);
          setEditId(null);
        } else {
          await createDompet({ nama });
        }
        setNama("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });

  const hapus = (id: string, nama: string) => {
    if (!confirm(`Hapus dompet ${nama}? Hanya bisa bila kosong.`)) return;
    start(async () => {
      setErr("");
      try {
        await deleteDompet(id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 font-semibold">
          <Wallet className="h-4 w-4 text-muted" />
          Dompet
        </p>
        <div className="flex flex-wrap gap-1.5">
          {initial.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-accent px-2 py-1 text-[13px]"
            >
              {d.nama}
              <button
                onClick={() => {
                  setEditId(d.id);
                  setNama(d.nama);
                  setErr("");
                }}
                aria-label={`Ubah ${d.nama}`}
                className="rounded p-0.5 text-muted hover:text-ink"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => hapus(d.id, d.nama)}
                aria-label={`Hapus ${d.nama}`}
                className="rounded p-0.5 text-muted hover:text-bad"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Field label={editId ? "Ubah nama" : "Dompet baru"} htmlFor="dp-nama" className="flex-1">
            <Input
              id="dp-nama"
              placeholder="Bank, E-wallet…"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") simpan();
              }}
            />
          </Field>
          <Button onClick={simpan} disabled={pending} variant="secondary" className="mt-6 shrink-0">
            <Plus className="h-4 w-4" />
            {editId ? "Simpan" : "Tambah"}
          </Button>
        </div>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      </CardContent>
    </Card>
  );
}
