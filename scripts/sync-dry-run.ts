// Local read-only test of the score-sync pipeline. Loads .env.local, fetches
// from the provider, maps fixtures to our match IDs, and prints what WOULD be
// written — without touching the database (dryRun: true).
//
//   npx tsx scripts/sync-dry-run.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i <= 0) continue;
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

async function main() {
  const { syncScores } = await import("@/lib/scores-sync/sync");
  const result = await syncScores({ dryRun: true, includeLive: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
