#!/usr/bin/env bash
# Blocks shell commands that can wipe Supabase / live Postgres.
set -euo pipefail

# Script goes through -e so stdin stays free for the hook's JSON payload.
SCRIPT=$(cat <<'NODE'
const chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  let cmd = "";
  try {
    cmd = JSON.parse(Buffer.concat(chunks).toString("utf8")).command || "";
  } catch {
    console.log(JSON.stringify({ permission: "allow" }));
    process.exit(0);
  }

  const touchesSupabase = /supabase\.com/i.test(cmd);
  const localOnly =
    /127\.0\.0\.1:5433|:5433\/tallypns|postgresql:\/\/postgres:postgres@127\.0\.0\.1:5433/i.test(
      cmd
    ) && !touchesSupabase;

  const dangerous = [
    /\bprisma\s+migrate\s+reset\b/i,
    /\bprisma\s+migrate\s+dev\b/i,
    /\bprisma\s+db\s+push\b[^\n]*(?:--force-reset|--accept-data-loss)/i,
    /--shadow-database-url/i,
    /\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/i,
    /\bTRUNCATE\b/i,
    /\bpg_restore\b[^\n]*--clean/i,
  ];

  for (const pattern of dangerous) {
    if (!pattern.test(cmd)) continue;
    if (localOnly) continue;
    console.log(
      JSON.stringify({
        permission: "deny",
        user_message:
          "Blocked: this command can delete or wipe database data. For agent tests use Docker Postgres (port 5433). For live schema changes use: npm run db:migrate",
        agent_message:
          "Hook blocked a destructive database command (never-delete-database rule).",
      })
    );
    process.exit(0);
  }

  if (/\bprisma\s+migrate\s+diff\b/i.test(cmd) && /--shadow-database-url/i.test(cmd) && touchesSupabase) {
    console.log(
      JSON.stringify({
        permission: "deny",
        user_message:
          "Blocked: do not point Prisma shadow database at Supabase (it wipes the target first).",
        agent_message: "Hook blocked prisma migrate diff with live shadow URL.",
      })
    );
    process.exit(0);
  }

  console.log(JSON.stringify({ permission: "allow" }));
});
NODE
)
node -e "$SCRIPT"
