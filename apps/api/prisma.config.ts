import { defineConfig as orm, prisma7Schema } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: orm({
    contract: prisma7Schema("prisma/schema.prisma"),
    output: "src/prisma",
    db: { connection: process.env["DATABASE_URL"] ?? "" },
  }),
});
