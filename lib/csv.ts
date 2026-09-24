// CSV transaksi: murni (tanpa DB) agar bisa di-unit-test.
// Kolom: tanggal,jenis,jumlah,kategori,produk,catatan,dompet,hargaSatuan

export type CsvTransaksi = {
  tanggal: string;
  jenis: string;
  jumlah: number;
  kategori: string;
  produk: string;
  catatan: string;
  dompet: string;
  hargaSatuan: number | null;
};

const HEADER = "tanggal,jenis,jumlah,kategori,produk,catatan,dompet,hargaSatuan";

function esc(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function keTransaksiCsv(rows: CsvTransaksi[]): string {
  const baris = rows.map((r) =>
    [
      r.tanggal,
      r.jenis,
      String(r.jumlah),
      esc(r.kategori),
      esc(r.produk),
      esc(r.catatan),
      esc(r.dompet),
      r.hargaSatuan == null ? "" : String(r.hargaSatuan),
    ].join(","),
  );
  return [HEADER, ...baris].join("\n");
}

// Pecah baris CSV sederhana (mendukung kutip ganda "" escapes).
function pecahBaris(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let kutip = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (kutip) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          kutip = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      kutip = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export type HasilParse = {
  valid: { tanggal: string; jenis: "masuk" | "keluar"; jumlah: number; kategori: string }[];
  gagal: number;
  contohError: string[];
};

export function parseTransaksiCsv(teks: string, maks = 1000): HasilParse {
  const lines = teks.split(/\r?\n/).filter((l) => l.trim() !== "");
  const valid: HasilParse["valid"] = [];
  let gagal = 0;
  const contohError: string[] = [];
  const mulai = lines[0]?.startsWith("tanggal,") ? 1 : 0;
  for (let i = mulai; i < lines.length && valid.length < maks; i++) {
    const n = i + 1;
    const k = pecahBaris(lines[i]);
    const [tanggal = "", jenis = "", jumlahStr = "", kategori = ""] = k;
    const salah = (alasan: string) => {
      gagal++;
      if (contohError.length < 3) contohError.push(`baris ${n}: ${alasan}`);
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal.trim())) {
      salah("tanggal bukan YYYY-MM-DD");
      continue;
    }
    if (jenis.trim() !== "masuk" && jenis.trim() !== "keluar") {
      salah("jenis harus masuk/keluar");
      continue;
    }
    const jumlah = Number(jumlahStr.trim());
    if (!Number.isInteger(jumlah) || jumlah <= 0) {
      salah("jumlah harus bilangan > 0");
      continue;
    }
    if (!kategori.trim()) {
      salah("kategori kosong");
      continue;
    }
    valid.push({ tanggal: tanggal.trim(), jenis: jenis.trim() as "masuk" | "keluar", jumlah, kategori: kategori.trim() });
  }
  return { valid, gagal, contohError };
}
