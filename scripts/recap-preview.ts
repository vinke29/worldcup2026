// Preview the personalized daily recap email without spamming anyone.
//
//   npx tsx scripts/recap-preview.ts                      # render (as a mid-table member)
//   npx tsx scripts/recap-preview.ts --as "Raul"          # render as a specific member
//   npx tsx scripts/recap-preview.ts --date 2026-06-13    # recap a specific day
//   npx tsx scripts/recap-preview.ts --send-test          # also email it to you
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const code = arg("code") ?? "P4UG3R";
  const dateArg = arg("date");
  const asOf = dateArg ? new Date(`${dateArg}T13:00:00Z`) : new Date();
  const asMember = arg("as");
  const sendTest = process.argv.includes("--send-test");

  const { buildLeagueRecap, sendDailyRecap } = await import("@/lib/daily-recap/send");
  const { renderRecapEmail } = await import("@/lib/daily-recap/render");
  const { unsubscribeUrl } = await import("@/lib/daily-recap/unsubscribe");

  const built = await buildLeagueRecap(code, asOf);
  if (!built) { console.error("League not found:", code); process.exit(1); }
  const { data, quips } = built;

  const m = asMember
    ? data.members.find((x) => x.name.toLowerCase().includes(asMember.toLowerCase())) ?? data.members[0]
    : data.members.find((x) => x.rankNow >= 3) ?? data.members[0]; // mid-table shows movement nicely

  const { subject, html } = renderRecapEmail(data, m, quips, code, unsubscribeUrl(m.id));
  writeFileSync("/tmp/recap-preview.html", html);

  console.log("RENDERED AS:", m.name, `(rank ${m.rankNow}, +${m.pointsGained} pts)`);
  console.log("SUBJECT    :", subject);
  console.log("GOAT       :", quips.goat ?? "(none)");
  console.log("HERO       :", quips.hero ?? "(none)");
  console.log("RESULTS    :", data.results.map((g) => `${g.home} ${g.homeScore}-${g.awayScore} ${g.away}`).join(" | ") || "(none)");
  console.log("UPCOMING   :", data.upcoming.map((g) => `${g.time} ${g.home} v ${g.away}`).join(" | ") || "(none)");
  console.log("\nHTML -> /tmp/recap-preview.html");

  if (sendTest) {
    const r = await sendDailyRecap({ leagueCode: code, mode: "test", asOf, asMember });
    console.log("TEST SEND:", JSON.stringify(r));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
