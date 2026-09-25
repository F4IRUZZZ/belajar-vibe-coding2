// Format Rupiah 2 arah: ketik 20000 -> tampil 20.000, simpan angka murni.
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export function parseRupiah(s: string): number {
  const digits = s.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function formatTanggalId(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Parse "YYYY-MM-DD" sebagai tengah hari lokal agar tidak geser hari
// saat disimpan ke Postgres timestamptz (pengganti hack T12:00:00 inline).
export function parseTanggalLokal(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error("Tanggal harus YYYY-MM-DD");
  return new Date(`${ymd}T12:00:00`);
}

// Default tanggal hari ini (lokal, bukan UTC) -> YYYY-MM-DD
export function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfWeek(): Date {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Senin = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Bulan berjalan "YYYY-MM" (lokal).
export function bulanIni(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// Batas lokal satu bulan "YYYY-MM" -> [dari, sampai).
export function rentangBulan(bulan: string): { dari: Date; sampai: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  if (!m) throw new Error("Bulan harus YYYY-MM");
  const th = Number(m[1]);
  const bl = Number(m[2]);
  if (bl < 1 || bl > 12) throw new Error("Bulan harus YYYY-MM");
  return { dari: new Date(th, bl - 1, 1), sampai: new Date(th, bl, 1) };
}
