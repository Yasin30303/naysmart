// tRPC Initialization
// Setup context, middleware, dan procedure untuk tRPC

import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import superjson from "superjson";
import { headers } from "next/headers";

// Type for user with role
type UserWithRole = {
  id: string;
  email: string;
  name: string;
  role?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Context yang digunakan di setiap request tRPC
 * Berisi informasi user yang sedang login
 */
export async function createTRPCContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    session,
    user: session?.user as UserWithRole | null,
  };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

/**
 * Public procedure - bisa diakses tanpa login
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - harus login
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Anda harus login terlebih dahulu",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Pemilik procedure - harus login sebagai pemilik
 */
export const pemilikProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.role !== "pemilik") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Akses ditolak. Hanya pemilik yang dapat mengakses fitur ini.",
      });
    }
    return next({ ctx });
  },
);

/**
 * Staf procedure - harus login sebagai staf
 */
export const stafProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "staf") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Akses ditolak. Hanya staf yang dapat mengakses fitur ini.",
    });
  }
  return next({ ctx });
});

export const router = t.router;
export const middleware = t.middleware;
