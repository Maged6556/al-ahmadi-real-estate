import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true },
    });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: { ...data, email: data.email.trim().toLowerCase() },
      select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true },
    });
  },
};
