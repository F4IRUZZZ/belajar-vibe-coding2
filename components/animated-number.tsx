"use client";
import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { formatRupiah } from "@/lib/format";

// Angka Rupiah count-up pegas. Non-animasi bila reduced-motion.
export function AnimatedNumber({ value, prefix = "Rp" }: { value: number; prefix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 120, damping: 20 });
  const teks = useTransform(spring, (v) => `${prefix}${formatRupiah(v)}`);
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  if (reduce) {
    return (
      <>
        {prefix}
        {formatRupiah(value)}
      </>
    );
  }
  return <motion.span>{teks}</motion.span>;
}
