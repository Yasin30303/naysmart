// Penjualan Router
// Input transaksi penjualan (staf) dan view (semua)

import { z } from "zod";
import { router, protectedProcedure, stafProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { Decimal } from "@prisma/client/runtime/library";

export const penjualanRouter = router({
  // CREATE - Input penjualan baru (staf)
  create: stafProcedure
    .input(
      z.object({
        tanggal: z.date(),
        items: z
          .array(
            z.object({
              produk_id: z.string(),
              jumlah: z.number().int().positive(),
            }),
          )
          .min(1, "Minimal harus ada 1 item"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Validasi dan hitung total
      let total = new Decimal(0);
      const details: Array<{
        produk_id: string;
        jumlah: number;
        subtotal: Decimal;
      }> = [];

      for (const item of input.items) {
        // Cek produk ada
        const produk = await prisma.produk.findUnique({
          where: { id: item.produk_id },
        });

        if (!produk) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Produk dengan ID ${item.produk_id} tidak ditemukan`,
          });
        }

        // Cek stok tersedia
        const stok = await prisma.stokHarian.findUnique({
          where: {
            tanggal_produk_id: {
              tanggal: input.tanggal,
              produk_id: item.produk_id,
            },
          },
        });

        if (!stok) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Stok untuk produk ${produk.nama_produk} pada tanggal ini belum diinput`,
          });
        }

        if (stok.stok_sisa < item.jumlah) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Stok ${produk.nama_produk} tidak mencukupi. Sisa: ${stok.stok_sisa}`,
          });
        }

        const subtotal = produk.harga.mul(item.jumlah);
        total = total.add(subtotal);

        details.push({
          produk_id: item.produk_id,
          jumlah: item.jumlah,
          subtotal,
        });
      }

      // Buat transaksi dalam database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Buat header penjualan
        const penjualan = await tx.penjualan.create({
          data: {
            tanggal: input.tanggal,
            user_id: ctx.user.id,
            total,
          },
        });

        // 2. Buat detail penjualan
        await tx.detailPenjualan.createMany({
          data: details.map((d) => ({
            penjualan_id: penjualan.id,
            produk_id: d.produk_id,
            jumlah: d.jumlah,
            subtotal: d.subtotal,
          })),
        });

        // 3. Update stok
        for (const item of input.items) {
          const stok = await tx.stokHarian.findUnique({
            where: {
              tanggal_produk_id: {
                tanggal: input.tanggal,
                produk_id: item.produk_id,
              },
            },
          });

          if (stok) {
            await tx.stokHarian.update({
              where: {
                tanggal_produk_id: {
                  tanggal: input.tanggal,
                  produk_id: item.produk_id,
                },
              },
              data: {
                stok_terjual: stok.stok_terjual + item.jumlah,
                stok_sisa: stok.stok_sisa - item.jumlah,
              },
            });
          }
        }

        return penjualan;
      });

      return result;
    }),

  // READ - List penjualan per tanggal
  listByDate: protectedProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      return prisma.penjualan.findMany({
        where: { tanggal: input.tanggal },
        include: {
          user: true,
          detail: {
            include: {
              produk: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // READ - Detail penjualan by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const penjualan = await prisma.penjualan.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          detail: {
            include: {
              produk: true,
            },
          },
        },
      });

      if (!penjualan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Penjualan tidak ditemukan",
        });
      }

      return penjualan;
    }),

  // READ - Summary penjualan per produk per tanggal
  summaryByDate: protectedProcedure
    .input(z.object({ tanggal: z.date() }))
    .query(async ({ input }) => {
      const details = await prisma.detailPenjualan.findMany({
        where: {
          penjualan: {
            tanggal: input.tanggal,
          },
        },
        include: {
          produk: true,
        },
      });

      // Group by produk
      const summary = new Map<
        string,
        {
          produk_id: string;
          nama_produk: string;
          total_terjual: number;
          total_pendapatan: Decimal;
        }
      >();

      for (const detail of details) {
        const key = detail.produk_id;
        if (!summary.has(key)) {
          summary.set(key, {
            produk_id: detail.produk_id,
            nama_produk: detail.produk.nama_produk,
            total_terjual: 0,
            total_pendapatan: new Decimal(0),
          });
        }

        const item = summary.get(key)!;
        item.total_terjual += detail.jumlah;
        item.total_pendapatan = item.total_pendapatan.add(detail.subtotal);
      }

      return Array.from(summary.values());
    }),
});
