// Stok Harian Router
// Input dan manajemen stok harian (hanya pemilik)

import { z } from "zod";
import { router, pemilikProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const stokHarianRouter = router({
  // CREATE/UPDATE - Input stok harian
  upsert: pemilikProcedure
    .input(
      z.object({
        tanggal: z.date(),
        produk_id: z.string(),
        stok_awal: z.number().int().min(0, "Stok awal tidak boleh negatif"),
      }),
    )
    .mutation(async ({ input }) => {
      // Cek apakah sudah ada stok untuk tanggal & produk ini
      const existing = await prisma.stokHarian.findUnique({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
      });

      if (existing) {
        // Update: pertahankan stok_terjual, recalculate stok_sisa
        const stok = await prisma.stokHarian.update({
          where: {
            tanggal_produk_id: {
              tanggal: input.tanggal,
              produk_id: input.produk_id,
            },
          },
          data: {
            stok_awal: input.stok_awal,
            stok_sisa: input.stok_awal - existing.stok_terjual,
          },
        });
        return stok;
      } else {
        // Create baru
        const stok = await prisma.stokHarian.create({
          data: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
            stok_awal: input.stok_awal,
            stok_terjual: 0,
            stok_sisa: input.stok_awal,
          },
        });
        return stok;
      }
    }),

  // BULK CREATE/UPDATE - Input semua stok harian sekaligus
  bulkUpsert: pemilikProcedure
    .input(
      z.object({
        tanggal: z.date(),
        items: z.array(
          z.object({
            produk_id: z.string(),
            stok_awal: z.number().int().min(0, "Stok awal tidak boleh negatif"),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const item of input.items) {
        // Cek apakah sudah ada stok untuk tanggal & produk ini
        const existing = await prisma.stokHarian.findUnique({
          where: {
            tanggal_produk_id: {
              tanggal: input.tanggal,
              produk_id: item.produk_id,
            },
          },
        });

        if (existing) {
          // Update: pertahankan stok_terjual, recalculate stok_sisa
          const stok = await prisma.stokHarian.update({
            where: {
              tanggal_produk_id: {
                tanggal: input.tanggal,
                produk_id: item.produk_id,
              },
            },
            data: {
              stok_awal: item.stok_awal,
              stok_sisa: item.stok_awal - existing.stok_terjual,
            },
          });
          results.push(stok);
        } else {
          // Create baru
          const stok = await prisma.stokHarian.create({
            data: {
              tanggal: input.tanggal,
              produk_id: item.produk_id,
              stok_awal: item.stok_awal,
              stok_terjual: 0,
              stok_sisa: item.stok_awal,
            },
          });
          results.push(stok);
        }
      }

      return results;
    }),

  // READ - List stok harian per tanggal
  listByDate: protectedProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      return prisma.stokHarian.findMany({
        where: { tanggal: input.tanggal },
        include: { produk: true },
        orderBy: { produk: { nama_produk: "asc" } },
      });
    }),

  // READ - Get stok untuk produk tertentu di tanggal tertentu
  getByDateAndProduk: protectedProcedure
    .input(
      z.object({
        tanggal: z.date(),
        produk_id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return prisma.stokHarian.findUnique({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
        include: { produk: true },
      });
    }),

  // UPDATE - Kurangi stok (dipanggil otomatis saat penjualan)
  kurangiStok: protectedProcedure
    .input(
      z.object({
        tanggal: z.date(),
        produk_id: z.string(),
        jumlah: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const stok = await prisma.stokHarian.findUnique({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
      });

      if (!stok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stok untuk tanggal dan produk ini belum diinput",
        });
      }

      if (stok.stok_sisa < input.jumlah) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Stok tidak mencukupi. Sisa stok: ${stok.stok_sisa}`,
        });
      }

      return prisma.stokHarian.update({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
        data: {
          stok_terjual: stok.stok_terjual + input.jumlah,
          stok_sisa: stok.stok_sisa - input.jumlah,
        },
      });
    }),

  // DELETE - Hapus stok harian
  delete: pemilikProcedure
    .input(
      z.object({
        tanggal: z.date(),
        produk_id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const stok = await prisma.stokHarian.findUnique({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
      });

      if (!stok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Data stok tidak ditemukan",
        });
      }

      if (stok.stok_terjual > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stok tidak dapat dihapus karena sudah ada penjualan",
        });
      }

      await prisma.stokHarian.delete({
        where: {
          tanggal_produk_id: {
            tanggal: input.tanggal,
            produk_id: input.produk_id,
          },
        },
      });

      return { success: true };
    }),
});
