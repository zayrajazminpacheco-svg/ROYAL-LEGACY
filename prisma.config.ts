import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "node -r dotenv/config scripts/seed.js",
  },

  datasource: {
    url: env("DIRECT_URL"),
  },
});