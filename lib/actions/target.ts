"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseRupiah, parseTanggalLokal } from "@/lib/format";

const targetSchema = z.object({
  nama: z.string().min(1).max(100),
  target: z.string().min(1),
  deadline: z.string().optional(),
});

function segarkan() {
  revalidatePath("/");
  revalidatePath("/target");
  revalidatePath("/transaksi");
}

export async function createTarget(input: z.infer<typeof targetSchema>) {
  const user = await wajibUser();
  const p = targetSchema.parse(input);
  const nama = p.nama.trim();
  if (!nama) throw new Error("Nama wajib");
  const target = parseRupiah(p.target);
  if (target <= 0) throw new Error("Target harus > 0");
  await prisma.target.create({
    data: {
      userId: user.id,
      nama,
      target,
      deadline: p.deadline ? parseTanggalLokal(p.deadline) : null,
    },
  });
  segarkan();
}

export async function updateTarget(id: string, input: z.infer<typeof targetSchema>) {
  const user = await wajibUser();
  const p = targetSchema.parse(input);
  const nama = p.nama.trim();
  if (!nama) throw new Error("Nama wajib");
  const target = parseRupiah(p.target);
  if (target <= 0) throw new Error("Target harus > 0");
  const r = await prisma.target.updateMany({
    where: { id, userId: user.id },
    data: { nama, target, deadline: p.deadline ? parseTanggalLokal(p.deadline) : null },
  });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}

export async function deleteTarget(id: string) {
  const user = await wajibUser();
  const r = await prisma.target.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}
