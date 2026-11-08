import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { loadEnv } from "../src/config/load-env.js";

loadEnv();

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  ADMIN_EMAIL: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z
    .string()
    .min(10, "ADMIN_PASSWORD must contain at least 10 characters")
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "ADMIN_PASSWORD must be at most 72 UTF-8 bytes for bcrypt",
    ),
});

function parseSeedEnv(environment: NodeJS.ProcessEnv) {
  const result = seedEnvSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      `Invalid admin seed configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }

  return result.data;
}

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = parseSeedEnv(process.env);
  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { role: true },
  });

  if (existingUser) {
    if (existingUser.role !== UserRole.ADMIN) {
      throw new Error(
        "The configured admin email already belongs to a non-admin user; no role was changed.",
      );
    }

    console.info(
      "The configured admin account already exists; no changes were made.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  console.info("The initial admin account was created.");
}

seedAdmin()
  .catch((error: unknown) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
