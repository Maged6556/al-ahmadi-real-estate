import { PrismaClient } from "@prisma/client";

declare global {
  var __alAhmadiPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__alAhmadiPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__alAhmadiPrisma = prisma;
}
