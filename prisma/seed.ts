import { prisma } from "@/lib/prisma";

export async function main() {
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
  const count = await prisma.transaksi.count();
  if (count === 0) {
    const t1 = await prisma.transaksi.create({
      data: { jenis: "masuk", jumlah: 300000, tanggal: new Date(), kategori: "Gajian" },
    });
    await prisma.catatan.create({ data: { transaksiId: t1.id, isi: "Gajian minggu ini" } });
    await prisma.transaksi.create({
      data: { jenis: "keluar", jumlah: 50000, tanggal: new Date(), kategori: "Pangan", produkId: beras.id },
    });
  }
  console.log("seed ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
