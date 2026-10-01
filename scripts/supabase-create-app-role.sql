-- Run once in Supabase → SQL Editor (as postgres / owner).
-- Then point Render DATABASE_URL at tallypns_app; keep owner URL only for backups/migrate locally.
--
-- 1. Replace the password below before running.
-- 2. After this, update Render env DATABASE_URL (pooler) to use tallypns_app.
-- 3. Keep DIRECT_URL as postgres owner in GitHub secrets + local backup only — not in Render.

CREATE ROLE tallypns_app WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

GRANT USAGE ON SCHEMA public TO tallypns_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tallypns_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tallypns_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tallypns_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tallypns_app;

-- tallypns_app cannot DROP/TRUNCATE (no DDL privileges).
