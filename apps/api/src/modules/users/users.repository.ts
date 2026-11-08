import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: { ...data, email: data.email.trim().toLowerCase() },
    });
  },
};
