// Root tRPC Router
// Menggabungkan semua router menjadi satu

import { router } from "../trpc";
import { produkRouter } from "./produk";
import { kriteriaRouter } from "./kriteria";
import { stokHarianRouter } from "./stok-harian";
import { penjualanRouter } from "./penjualan";
import { smartRouter } from "./smart";

export const appRouter = router({
  produk: produkRouter,
  kriteria: kriteriaRouter,
  stokHarian: stokHarianRouter,
  penjualan: penjualanRouter,
  smart: smartRouter,
});

export type AppRouter = typeof appRouter;
