import { createAdminClient } from "@/lib/supabase/admin";
import type { ScoreEntry } from "@/lib/bracket";
import { getProvider } from "./provider";
import { buildMatchIndex, mapFixture } from "./map-fixtures";

export interface SyncResult {
  provider: string;
  fetched: number;   // fixtures returned by the provider (live + finished)
  written: number;   // rows upserted into match_scores (0 on a dry run)
  unmatched: string[]; // provider pairings we couldn't map (alias gaps)
  includeLive: boolean;
  dryRun: boolean;
  preview: Array<{ matchId: string; home: number; away: number; status: string }>;
}

/**
 * Fetch current results from the configured provider and upsert them into
 * match_scores. Idempotent: safe to run on any cadence. With the mock provider
 * (no API key) it's a no-op that reports zeroes.
 */
export async function syncScores(opts?: { includeLive?: boolean; dryRun?: boolean }): Promise<SyncResult> {
  const includeLive = opts?.includeLive ?? true;
  const dryRun = opts?.dryRun ?? false;
  const provider = getProvider();
  const fixtures = await provider.fetchFixtures();

  // No data (e.g. mock provider before an API key is set) → nothing to do, and
  // we avoid requiring the service-role key just to no-op.
  if (fixtures.length === 0) {
    return { provider: provider.name, fetched: 0, written: 0, unmatched: [], includeLive, dryRun, preview: [] };
  }

  const supabase = createAdminClient();

  // Existing scores let us resolve which teams currently occupy each KO slot.
  const { data: existing, error: readErr } = await supabase
    .from("match_scores")
    .select("match_id, home_score, away_score, pens_winner");
  if (readErr) throw readErr;

  const actual: Record<string, ScoreEntry> = {};
  for (const r of existing ?? []) {
    actual[r.match_id] = {
      home: r.home_score,
      away: r.away_score,
      ...(r.pens_winner ? { pens: r.pens_winner as "home" | "away" } : {}),
    };
  }

  const index = buildMatchIndex(actual);
  const unmatched: string[] = [];
  const rows: Array<{
    match_id: string;
    home_score: number;
    away_score: number;
    pens_winner: "home" | "away" | null;
    updated_at: string;
  }> = [];

  for (const fx of fixtures) {
    if (fx.status === "live" && !includeLive) continue;

    const mapped = mapFixture(fx, index);
    if (!mapped) {
      unmatched.push(`${fx.homeTeam} v ${fx.awayTeam}`);
      continue;
    }
    rows.push({
      match_id: mapped.matchId,
      home_score: mapped.home,
      away_score: mapped.away,
      pens_winner: mapped.pens,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0 && !dryRun) {
    const { error } = await supabase
      .from("match_scores")
      .upsert(rows, { onConflict: "match_id" });
    if (error) throw error;
  }

  if (unmatched.length > 0) {
    console.warn(`[sync-scores] ${unmatched.length} unmatched fixtures (add aliases):`, unmatched);
  }

  const preview = rows.map((r) => {
    const fx = fixtures.find((f) => mapFixture(f, index)?.matchId === r.match_id);
    return { matchId: r.match_id, home: r.home_score, away: r.away_score, status: fx?.status ?? "?" };
  });

  return {
    provider: provider.name,
    fetched: fixtures.length,
    written: dryRun ? 0 : rows.length,
    unmatched,
    includeLive,
    dryRun,
    preview,
  };
}
