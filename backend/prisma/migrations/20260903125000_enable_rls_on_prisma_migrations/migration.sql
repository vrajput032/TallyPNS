-- Prisma's own migration history table is in public and was still
-- exposed to PostgREST. Enable RLS with no policies so the anon key
-- cannot read it. Prisma (postgres owner) is unaffected.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
