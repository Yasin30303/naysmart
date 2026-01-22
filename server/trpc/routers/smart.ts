// SMART Router
// Perhitungan dan hasil SMART (hanya pemilik)

import { z } from "zod";
import { router, pemilikProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { hitungSMART, getHasilSMART } from "@/lib/smart";
import { Decimal } from "@prisma/client/runtime/library";

export const smartRouter = router({
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
