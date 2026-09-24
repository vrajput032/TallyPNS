import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Interactive `$transaction` callbacks must stay on one Postgres session.
 * DATABASE_URL is the Supabase transaction pooler (6543), which drops that
 * session between queries and surfaces as Prisma P2028. DIRECT_URL is the
 * session pooler (5432).
 */
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

export const dbTransactionOptions = { maxWait: 10_000, timeout: 20_000 } as const;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
