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
