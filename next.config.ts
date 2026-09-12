import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma's generated client and better-sqlite3 stay outside the bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3", "better-sqlite3", "exceljs"],
};

export default nextConfig;
