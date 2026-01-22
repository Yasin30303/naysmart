// Kriteria Router
// CRUD untuk master data kriteria (hanya pemilik)

import { z } from "zod";
import { router, pemilikProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { Decimal } from "@prisma/client/runtime/library";

export const kriteriaRouter = router({
  // CREATE - Tambah kriteria baru
  create: pemilikProcedure
    .input(
      z.object({
        nama_kriteria: z.string().min(1, "Nama kriteria harus diisi"),
        bobot: z.number().min(0).max(1, "Bobot harus antara 0 dan 1"),
        tipe: z.enum(["benefit", "cost"]),
      }),
    )
    .mutation(async ({ input }) => {
      // Validasi: cek total bobot tidak melebihi 1
      const existingKriteria = await prisma.kriteria.findMany();
      const currentTotal = existingKriteria.reduce(
        (sum, k) => sum + k.bobot.toNumber(),
        0,
      );

      if (currentTotal + input.bobot > 1.0001) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Total bobot akan melebihi 1.0. Total saat ini: ${currentTotal.toFixed(4)}`,
        });
      }

      const kriteria = await prisma.kriteria.create({
        data: {
          nama_kriteria: input.nama_kriteria,
          bobot: new Decimal(input.bobot),
          tipe: input.tipe,
        },
      });

      return kriteria;
    }),

  // READ - List semua kriteria
  list: protectedProcedure.query(async () => {
    return prisma.kriteria.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // READ - Get total bobot saat ini
  getTotalBobot: protectedProcedure.query(async () => {
    const kriteria = await prisma.kriteria.findMany();
    const total = kriteria.reduce((sum, k) => sum + k.bobot.toNumber(), 0);
    return { total, isValid: Math.abs(total - 1) < 0.0001 };
  }),

  // UPDATE - Edit kriteria
  update: pemilikProcedure
    .input(
      z.object({
        id: z.string(),
        nama_kriteria: z.string().min(1, "Nama kriteria harus diisi"),
        bobot: z.number().min(0).max(1, "Bobot harus antara 0 dan 1"),
        tipe: z.enum(["benefit", "cost"]),
      }),
    )
    .mutation(async ({ input }) => {
      // Validasi: cek total bobot
      const existingKriteria = await prisma.kriteria.findMany({
        where: { id: { not: input.id } },
      });

      const currentTotal = existingKriteria.reduce(
        (sum, k) => sum + k.bobot.toNumber(),
        0,
      );

      if (currentTotal + input.bobot > 1.0001) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Total bobot akan melebihi 1.0. Total kriteria lain: ${currentTotal.toFixed(4)}`,
        });
      }

      const kriteria = await prisma.kriteria.update({
        where: { id: input.id },
        data: {
          nama_kriteria: input.nama_kriteria,
          bobot: new Decimal(input.bobot),
          tipe: input.tipe,
        },
      });

      return kriteria;
    }),

  // DELETE - Hapus kriteria
  delete: pemilikProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Cek apakah kriteria sudah digunakan
      const hasNilai = await prisma.nilaiAlternatif.findFirst({
        where: { kriteria_id: input.id },
      });

      if (hasNilai) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Kriteria tidak dapat dihapus karena sudah ada nilai alternatif",
        });
      }

      await prisma.kriteria.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
