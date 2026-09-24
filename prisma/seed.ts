import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function main() {
  // User dev untuk seed (login via Google dengan email yang sama di dev).
  let user = await prisma.user.findFirst({ where: { email: "dev@lokal" } });
  if (!user) {
    user = await prisma.user.create({
      data: { id: randomUUID(), name: "Dev", email: "dev@lokal" },
    });
  }
  const beras = await prisma.produk.upsert({
    where: { namaLower: "beras" },
    update: {},
    create: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
  });
  await prisma.produk.upsert({
    where: { namaLower: "sabun" },
    update: {},
    create: { nama: "Sabun", namaLower: "sabun", kategori: "Mandi" },
  });
  const count = await prisma.transaksi.count({ where: { userId: user.id } });
  if (count === 0) {
    const t1 = await prisma.transaksi.create({
      data: { userId: user.id, jenis: "masuk", jumlah: 300000, tanggal: new Date(), kategori: "Gajian" },
    });
    await prisma.catatan.create({ data: { transaksiId: t1.id, isi: "Gajian minggu ini" } });
    await prisma.transaksi.create({
      data: {
        userId: user.id,
        jenis: "keluar",
        jumlah: 50000,
        tanggal: new Date(),
        kategori: "Pangan",
        produkId: beras.id,
      },
    });
  }
  console.log("seed ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
