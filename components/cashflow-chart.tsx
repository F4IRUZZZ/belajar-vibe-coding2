"use client";

import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, ChartLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/animated-number";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Point = { label: string; masuk: number; keluar: number };
type Mode = "semua" | "masuk" | "keluar";

const W = 560;
const H = 200;
const PAD = { l: 8, r: 8, t: 12, b: 8 };

function fmtShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return `${n}`;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export interface CashflowChartProps {
  data: Point[];
  title?: string;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
}

export function CashflowChart({
  data,
  title = "Arus kas · Senin–Minggu",
  emptyTitle = "Belum ada arus kas minggu ini",
  emptyHint = "Catat transaksi agar grafik bergerak.",
  className,
}: CashflowChartProps) {
  const [mode, setMode] = useState<Mode>("semua");
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradMasuk = `cf-masuk-${uid}`;
  const gradKeluar = `cf-keluar-${uid}`;

  const totals = useMemo(() => {
    const masuk = data.reduce((a, d) => a + d.masuk, 0);
    const keluar = data.reduce((a, d) => a + d.keluar, 0);
    return { masuk, keluar, net: masuk - keluar };
  }, [data]);

  const max = Math.max(1, ...data.flatMap((d) => (mode === "semua" ? [d.masuk, d.keluar] : [d[mode]])));

  const geom = useMemo(() => {
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const x = (i: number) => PAD.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = (v: number) => PAD.t + ih - (v / max) * ih;
    const masukPts = data.map((d, i) => ({ x: x(i), y: y(d.masuk) }));
    const keluarPts = data.map((d, i) => ({ x: x(i), y: y(d.keluar) }));
    const base = PAD.t + ih;
    return { x, y, masukPts, keluarPts, base };
  }, [data, max]);

  const showMasuk = mode !== "keluar";
  const showKeluar = mode !== "masuk";
  const lineMasuk = smoothPath(geom.masukPts);
  const lineKeluar = smoothPath(geom.keluarPts);
  const areaMasuk = `${lineMasuk} L ${geom.masukPts[geom.masukPts.length - 1]?.x ?? 0} ${geom.base} L ${geom.masukPts[0]?.x ?? 0} ${geom.base} Z`;
  const areaKeluar = `${lineKeluar} L ${geom.keluarPts[geom.keluarPts.length - 1]?.x ?? 0} ${geom.base} L ${geom.keluarPts[0]?.x ?? 0} ${geom.base} Z`;

  if (totals.masuk === 0 && totals.keluar === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center gap-2 p-4 py-10 text-center">
          <ChartLine className="h-6 w-6 text-muted" />
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-[13px] text-muted">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  const hovered = hover != null ? data[hover] : null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {title}
          </p>
          <div className="ml-auto flex rounded-lg border border-line bg-canvas/60 p-0.5" role="tablist" aria-label="Mode grafik">
            {(["semua", "masuk", "keluar"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setHover(null); }}
                className={cn(
                  "relative rounded-md px-2.5 py-1 font-mono text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-glow/60",
                  mode === m ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {mode === m && (
                  <motion.span
                    layoutId={`chart-mode-${uid}`}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-md bg-glow/15 ring-1 ring-glow/30"
                  />
                )}
                <span className="relative capitalize">{m}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-ok" />
            <AnimatedNumber value={totals.masuk} />
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDownRight className="h-3.5 w-3.5 text-glow" />
            <AnimatedNumber value={totals.keluar} />
          </span>
          <span className={cn("ml-auto font-semibold", totals.net < 0 ? "text-bad" : "text-ink")}>
            Net {totals.net < 0 ? "−" : "+"}
            <AnimatedNumber value={Math.abs(totals.net)} prefix="" />
          </span>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-48 w-full"
            role="img"
            aria-label="Grafik arus kas harian"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width) * W;
              let best = 0;
              let bestDist = Infinity;
              data.forEach((_, i) => {
                const d = Math.abs(geom.x(i) - px);
                if (d < bestDist) { bestDist = d; best = i; }
              });
              setHover(best);
            }}
          >
            <defs>
              <linearGradient id={gradMasuk} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7fd6a4" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#7fd6a4" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={gradKeluar} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b9cff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#5b9cff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line
                  x1={PAD.l} x2={W - PAD.r}
                  y1={PAD.t + (H - PAD.t - PAD.b) * (1 - f)}
                  y2={PAD.t + (H - PAD.t - PAD.b) * (1 - f)}
                  stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 5"
                />
                <text
                  x={W - PAD.r} y={PAD.t + (H - PAD.t - PAD.b) * (1 - f) - 4}
                  textAnchor="end" fontSize="10" fill="currentColor" opacity="0.45"
                >
                  {fmtShort(max * f)}
                </text>
              </g>
            ))}

            {showMasuk && (
              <>
                <motion.path
                  key={`a-m-${mode}`}
                  d={areaMasuk}
                  fill={`url(#${gradMasuk})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 0.7, delay: 0.25 }}
                />
                <motion.path
                  key={`l-m-${mode}`}
                  d={lineMasuk}
                  fill="none"
                  stroke="#7fd6a4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}
            {showKeluar && (
              <>
                <motion.path
                  key={`a-k-${mode}`}
                  d={areaKeluar}
                  fill={`url(#${gradKeluar})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 0.7, delay: 0.35 }}
                />
                <motion.path
                  key={`l-k-${mode}`}
                  d={lineKeluar}
                  fill="none"
                  stroke="#5b9cff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 1.1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}

            {data.map((d, i) => {
              const isH = hover === i;
              return (
                <g key={d.label}>
                  {(showMasuk || showKeluar) && (
                    <circle
                      cx={geom.x(i)}
                      cy={showKeluar && !showMasuk ? geom.keluarPts[i].y : geom.masukPts[i].y}
                      r={isH ? 4.5 : 0}
                      fill="var(--color-panel)"
                      stroke={showKeluar && !showMasuk ? "#5b9cff" : "#7fd6a4"}
                      strokeWidth="2"
                    />
                  )}
                  {isH && (
                    <line
                      x1={geom.x(i)} x2={geom.x(i)} y1={PAD.t} y2={geom.base}
                      stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 3"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {hovered && hover != null && (
            <div
              className="anim-pop pointer-events-none absolute z-10 w-40 rounded-lg border border-line bg-panel p-2 shadow-overlay"
              style={{
                left: `clamp(0%, ${(geom.x(hover) / W) * 100}%, 100%)`,
                top: 0,
                transform: hover > data.length - 3 ? "translateX(-100%)" : "translateX(8%)",
              }}
            >
              <p className="font-mono text-[11px] text-muted">{hovered.label} · minggu ini</p>
              <p className="mt-0.5 text-[12px] text-ok">Masuk Rp{formatRupiah(hovered.masuk)}</p>
              <p className="text-[12px] text-irish-soft">Keluar Rp{formatRupiah(hovered.keluar)}</p>
            </div>
          )}

          <div className="mt-1 flex">
            {data.map((d, i) => (
              <button
                key={d.label}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => setHover(i)}
                className={cn(
                  "flex-1 rounded py-0.5 text-center font-mono text-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-glow/60",
                  hover === i ? "text-ink" : "text-muted",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-ok" /> masuk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-glow" /> keluar
          </span>
          <span>arahkan kursor untuk detail</span>
        </p>
      </CardContent>
    </Card>
  );
}
