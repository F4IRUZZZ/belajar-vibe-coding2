import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function main() {
  // User dev untuk seed (password: keluarga123 — ganti di produksi).
  let user = await prisma.user.findFirst({ where: { emailLower: "dev@lokal" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "dev@lokal",
        emailLower: "dev@lokal",
        username: "Dev",
        usernameLower: "dev",
        passwordHash: await bcrypt.hash("keluarga123", 10),
        role: "keluarga",
      },
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
