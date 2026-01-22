// Produk Router
// CRUD untuk master data produk (hanya pemilik)

import { z } from "zod";
import { router, pemilikProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { Decimal } from "@prisma/client/runtime/library";

export const produkRouter = router({
  // CREATE - Tambah produk baru
  create: pemilikProcedure
    .input(
      z.object({
        nama_produk: z.string().min(1, "Nama produk harus diisi"),
        harga: z.number().positive("Harga harus lebih dari 0"),
        harga_awal: z.number().min(0, "Harga awal tidak boleh negatif").default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const produk = await prisma.produk.create({
        data: {
          nama_produk: input.nama_produk,
          harga: new Decimal(input.harga),
          harga_awal: new Decimal(input.harga_awal),
        },
      });
      return produk;
    }),

  // READ - List semua produk
  list: protectedProcedure.query(async () => {
    return prisma.produk.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // READ - Get produk by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const produk = await prisma.produk.findUnique({
        where: { id: input.id },
      });

      if (!produk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan",
        });
      }

      return produk;
    }),

  // UPDATE - Edit produk
  update: pemilikProcedure
    .input(
      z.object({
        id: z.string(),
        nama_produk: z.string().min(1, "Nama produk harus diisi"),
        harga: z.number().positive("Harga harus lebih dari 0"),
        harga_awal: z.number().min(0, "Harga awal tidak boleh negatif").default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const produk = await prisma.produk.update({
        where: { id: input.id },
        data: {
          nama_produk: input.nama_produk,
          harga: new Decimal(input.harga),
          harga_awal: new Decimal(input.harga_awal),
        },
      });
      return produk;
    }),

  // DELETE - Hapus produk
  delete: pemilikProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Cek apakah produk sudah pernah digunakan di transaksi
      const hasPenjualan = await prisma.detailPenjualan.findFirst({
        where: { produk_id: input.id },
      });

      if (hasPenjualan) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Produk tidak dapat dihapus karena sudah ada di transaksi penjualan",
        });
      }

      await prisma.produk.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
