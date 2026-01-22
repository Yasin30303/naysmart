// SMART Router
// Perhitungan dan hasil SMART (hanya pemilik)

import { z } from "zod";
import { router, pemilikProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { hitungSMART, getHasilSMART } from "@/lib/smart";
import { Decimal } from "@prisma/client/runtime/library";

export const smartRouter = router({
  // AUTO-CALCULATE - Get nilai alternatif otomatis dari data penjualan & stok
  // Based on fixed kriteria:
  // 1. Stok Terjual (0.25, benefit) - from stok_harian.stok_terjual
  // 2. Keuntungan (0.30, benefit) - (harga - harga_awal) * stok_terjual
  // 3. Sisa Produk (0.10, cost) - from stok_harian.stok_sisa
  // 4. Harga (0.03, benefit) - from produk.harga
  // 5. Harga Awal (0.02, cost) - from produk.harga_awal
  // 6. Stok Awal (0.05, benefit) - from stok_harian.stok_awal
  // 7. Omzet (0.20, benefit) - stok_terjual * harga
  // 8. Hari Penjualan (0.05, benefit) - count of days with sales
  getAutoCalculatedValues: pemilikProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      const { tanggal } = input;
      
      // Get all products
      const produkList = await prisma.produk.findMany();
      
      // Get all kriteria
      const kriteriaList = await prisma.kriteria.findMany();
      
      // Get stok harian for the date
      const stokHarian = await prisma.stokHarian.findMany({
        where: { tanggal },
      });
      
      // Get penjualan for the date with details
      const penjualan = await prisma.penjualan.findMany({
        where: { tanggal },
        include: {
          detail: true,
        },
      });
      
      // Get count of selling days per product (for Hari Penjualan)
      const sellingDaysCount: Record<string, number> = {};
      
      // Count distinct selling days per product
      const allSales = await prisma.detailPenjualan.findMany({
        include: {
          penjualan: true,
        },
      });
      
      for (const detail of allSales) {
        const produkId = detail.produk_id;
        const salesDate = detail.penjualan.tanggal.toISOString().split('T')[0];
        
        if (!sellingDaysCount[produkId]) {
          sellingDaysCount[produkId] = 0;
        }
        
        // Use a Set to track unique dates per product
        const key = `${produkId}_${salesDate}`;
        // Since we're counting in the loop, we need a different approach
        // Let's just increment (we'll calculate properly below)
      }
      
      // Better approach for counting selling days
      const salesByProduct = await prisma.detailPenjualan.groupBy({
        by: ['produk_id'],
        _count: {
          _all: true,
        },
      });
      
      // Count distinct dates per product
      const distinctDatesPerProduct: Record<string, Set<string>> = {};
      for (const detail of allSales) {
        const produkId = detail.produk_id;
        const salesDate = detail.penjualan.tanggal.toISOString().split('T')[0];
        
        if (!distinctDatesPerProduct[produkId]) {
          distinctDatesPerProduct[produkId] = new Set();
        }
        distinctDatesPerProduct[produkId].add(salesDate);
      }
      
      // Calculate values per product
      const result: Record<string, Record<string, number>> = {};
      
      for (const produk of produkList) {
        result[produk.id] = {};
        
        // Get stok for this product
        const stok = stokHarian.find(s => s.produk_id === produk.id);
        const stokSisa = stok ? stok.stok_sisa : 0;
        const stokAwal = stok ? stok.stok_awal : 0;
        const stokTerjual = stok ? stok.stok_terjual : 0;
        
        // Get product prices
        const hargaJual = produk.harga.toNumber();
        const hargaAwal = produk.harga_awal.toNumber();
        
        // Calculate derived values
        const keuntungan = (hargaJual - hargaAwal) * stokTerjual; // Profit
        const omzet = stokTerjual * hargaJual; // Revenue
        const hariPenjualan = distinctDatesPerProduct[produk.id]?.size || 0;
        
        // Map to kriteria based on name
        for (const kriteria of kriteriaList) {
          const namaKriteria = kriteria.nama_kriteria.toLowerCase();
          
          if (namaKriteria === "stok terjual") {
            result[produk.id][kriteria.id] = stokTerjual;
          } else if (namaKriteria === "keuntungan") {
            result[produk.id][kriteria.id] = keuntungan;
          } else if (namaKriteria === "sisa produk") {
            result[produk.id][kriteria.id] = stokSisa;
          } else if (namaKriteria === "harga") {
            result[produk.id][kriteria.id] = hargaJual;
          } else if (namaKriteria === "harga awal") {
            result[produk.id][kriteria.id] = hargaAwal;
          } else if (namaKriteria === "stok awal") {
            result[produk.id][kriteria.id] = stokAwal;
          } else if (namaKriteria === "omzet") {
            result[produk.id][kriteria.id] = omzet;
          } else if (namaKriteria === "hari penjualan") {
            result[produk.id][kriteria.id] = hariPenjualan;
          } else {
            // Fallback for old criteria names
            if (namaKriteria.includes("penjualan") || namaKriteria.includes("terjual")) {
              result[produk.id][kriteria.id] = stokTerjual;
            } else if (namaKriteria.includes("pendapatan") || namaKriteria.includes("revenue")) {
              result[produk.id][kriteria.id] = omzet;
            } else if (namaKriteria.includes("stok") || namaKriteria.includes("stock") || namaKriteria.includes("sisa")) {
              result[produk.id][kriteria.id] = stokSisa;
            } else if (namaKriteria.includes("margin") || namaKriteria.includes("profit")) {
              result[produk.id][kriteria.id] = keuntungan;
            } else {
              result[produk.id][kriteria.id] = 0;
            }
          }
        }
      }
      
      return {
        values: result,
        summary: {
          totalProduk: produkList.length,
          totalKriteria: kriteriaList.length,
          hasStokData: stokHarian.length > 0,
          hasPenjualanData: penjualan.length > 0,
        }
      };
    }),

  // CREATE/UPDATE - Input nilai alternatif
  inputNilaiAlternatif: pemilikProcedure
    .input(
      z.object({
        tanggal: z.date(),
        produk_id: z.string(),
        kriteria_id: z.string(),
        nilai: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const nilai = await prisma.nilaiAlternatif.upsert({
        where: {
          tanggal_produk_id_kriteria_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
            kriteria_id: input.kriteria_id,
          },
        },
        create: {
          tanggal: input.tanggal,
          produk_id: input.produk_id,
          kriteria_id: input.kriteria_id,
          nilai: new Decimal(input.nilai),
        },
        update: {
          nilai: new Decimal(input.nilai),
        },
      });

      return nilai;
    }),

  // CREATE - Bulk input nilai alternatif (untuk efisiensi)
  bulkInputNilaiAlternatif: pemilikProcedure
    .input(
      z.object({
        tanggal: z.date(),
        data: z.array(
          z.object({
            produk_id: z.string(),
            kriteria_id: z.string(),
            nilai: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      // Delete existing untuk tanggal ini, lalu insert baru
      await prisma.nilaiAlternatif.deleteMany({
        where: { tanggal: input.tanggal },
      });

      await prisma.nilaiAlternatif.createMany({
        data: input.data.map((d) => ({
          tanggal: input.tanggal,
          produk_id: d.produk_id,
          kriteria_id: d.kriteria_id,
          nilai: new Decimal(d.nilai),
        })),
      });

      return { success: true, count: input.data.length };
    }),

  // READ - Get nilai alternatif untuk tanggal tertentu
  getNilaiAlternatif: protectedProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      return prisma.nilaiAlternatif.findMany({
        where: { tanggal: input.tanggal },
        include: {
          produk: true,
          kriteria: true,
        },
        orderBy: [
          { produk: { nama_produk: "asc" } },
          { kriteria: { nama_kriteria: "asc" } },
        ],
      });
    }),

  // EXECUTE - Jalankan perhitungan SMART
  hitung: pemilikProcedure
    .input(z.object({ tanggal: z.date() }))
    .mutation(async ({ input }) => {
      const results = await hitungSMART(input.tanggal);
      return results;
    }),

  // READ - Get hasil SMART
  getHasil: protectedProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      return getHasilSMART(input.tanggal);
    }),

  // READ - List tanggal yang sudah ada hasil SMART
  listTanggalHasil: protectedProcedure.query(async () => {
    const hasil = await prisma.hasilSMART.findMany({
      select: { tanggal: true },
      distinct: ["tanggal"],
      orderBy: { tanggal: "desc" },
    });

    return hasil.map((h) => h.tanggal);
  }),

  // DELETE - Hapus hasil SMART untuk tanggal tertentu
  deleteHasil: pemilikProcedure
    .input(z.object({ tanggal: z.date() }))
    .mutation(async ({ input }) => {
      await prisma.hasilSMART.deleteMany({
        where: { tanggal: input.tanggal },
      });

      return { success: true };
    }),
});
