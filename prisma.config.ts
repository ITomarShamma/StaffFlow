import "dotenv/config";
import { defineConfig } from "prisma/config";

// The SQLite file lives in ./data by default (see docs/DEPLOY.md). DATABASE_URL overrides it.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/staffflow.db",
  },
});
