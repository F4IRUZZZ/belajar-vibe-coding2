import { describe, expect, it } from "vitest";
import { formatRupiah, formatTanggalId, parseRupiah, parseTanggalLokal, startOfMonth, startOfWeek, todayLocal } from "./format";

describe("parseRupiah", () => {
  it("mengambil digit dari input berformat", () => {
    expect(parseRupiah("20.000")).toBe(20000);
    expect(parseRupiah("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiah("50000")).toBe(50000);
  });

  it("kosong atau tanpa digit = 0", () => {
    expect(parseRupiah("")).toBe(0);
    expect(parseRupiah("Rp")).toBe(0);
  });
});

describe("formatRupiah", () => {
  it("format id-ID tanpa desimal", () => {
    expect(formatRupiah(20000)).toBe("20.000");
    expect(formatRupiah(1250000)).toBe("1.250.000");
    expect(formatRupiah(-500)).toBe("-500");
  });
});

describe("parseTanggalLokal", () => {
  it("tengah hari lokal, tanggal tidak geser", () => {
    const d = parseTanggalLokal("2026-09-24");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(12);
  });

  it("menolak format selain YYYY-MM-DD", () => {
    expect(() => parseTanggalLokal("24-09-2026")).toThrow("YYYY-MM-DD");
    expect(() => parseTanggalLokal("")).toThrow("YYYY-MM-DD");
  });
});

describe("tanggal lokal", () => {
  it("todayLocal = YYYY-MM-DD hari ini (lokal)", () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(todayLocal()).toBe(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  });

  it("startOfWeek = Senin jam 00:00", () => {
    const s = startOfWeek();
    expect((s.getDay() + 6) % 7).toBe(0);
    expect([s.getHours(), s.getMinutes(), s.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("startOfMonth = tanggal 1 jam 00:00", () => {
    const s = startOfMonth();
    expect(s.getDate()).toBe(1);
    expect([s.getHours(), s.getMinutes()]).toEqual([0, 0]);
  });

  it("formatTanggalId id-ID", () => {
    expect(formatTanggalId("2026-09-24T12:00:00")).toContain("2026");
  });
});
