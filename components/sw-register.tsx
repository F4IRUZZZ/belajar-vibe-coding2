"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW opsional; app tetap jalan tanpa offline-cache
      });
    }
  }, []);
  return null;
}
