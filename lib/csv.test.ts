import { describe, expect, it } from "vitest";
import { keTransaksiCsv, parseTransaksiCsv } from "./csv";

describe("keTransaksiCsv", () => {
  it("escape koma + kutip", () => {
    const s = keTransaksiCsv([
      {
        tanggal: "2026-09-01",
        jenis: "keluar",
        jumlah: 50000,
        kategori: "Pangan",
        produk: "Beras",
        catatan: 'beli "khusus", hemat',
        dompet: "Kas",
        hargaSatuan: 12000,
      },
    ]);
    expect(s.split("\n")).toHaveLength(2);
    expect(s).toContain('"beli ""khusus"", hemat"');
  });
});

describe("parseTransaksiCsv", () => {
  it("valid + header opsional + kutip", () => {
    const r = parseTransaksiCsv(
      'tanggal,jenis,jumlah,kategori\n2026-09-01,masuk,300000,Gajian\n2026-09-02,keluar,50000,"Pangan, basah"',
    );
    expect(r).toEqual({
      valid: [
        { tanggal: "2026-09-01", jenis: "masuk", jumlah: 300000, kategori: "Gajian" },
        { tanggal: "2026-09-02", jenis: "keluar", jumlah: 50000, kategori: "Pangan, basah" },
      ],
      gagal: 0,
      contohError: [],
    });
  });

  it("baris rusak dihitung + contoh error", () => {
    const r = parseTransaksiCsv(
      "2026-09-01,masuk,300000,Gajian\nsalah,keluar,100,X\n2026-09-02,bonus,100,X\n2026-09-03,keluar,0,X\n2026-09-04,keluar,100,",
    );
    expect(r.valid).toHaveLength(1);
    expect(r.gagal).toBe(4);
    expect(r.contohError.length).toBeLessThanOrEqual(3);
    expect(r.contohError[0]).toContain("baris 2");
  });
});
