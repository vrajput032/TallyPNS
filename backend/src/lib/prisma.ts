import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Interactive `$transaction` callbacks must stay on one Postgres session.
 * DATABASE_URL is the Supabase transaction pooler (6543), which drops that
 * session between queries and surfaces as Prisma P2028. DIRECT_URL is the
 * session pooler (5432).
 */
const DEFAULT_CONNECTION_LIMIT = "5";

/**
 * The session pooler caps clients at pool_size (15) across every backend
 * sharing the database, while Prisma defaults to num_cpus * 2 + 1 connections.
 */
function withConnectionLimit(url: string | undefined) {
  if (!url) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has("connection_limit")) {
    parsed.searchParams.set("connection_limit", DEFAULT_CONNECTION_LIMIT);
  }
  return parsed.toString();
}

const databaseUrl = withConnectionLimit(process.env.DIRECT_URL || process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

export const dbTransactionOptions = { maxWait: 10_000, timeout: 20_000 } as const;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
