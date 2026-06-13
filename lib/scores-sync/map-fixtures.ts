import { MATCHES, type Match } from "@/lib/mock-data";
import {
  TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID,
  KNOCKOUT_MATCH_META, resolveR32Pairs, resolveBracketTeams,
  type ScoreEntry,
} from "@/lib/bracket";
import { canonTeam } from "./team-aliases";
import type { MappedScore, ProviderFixture } from "./types";

type ActualScores = Record<string, ScoreEntry>;

interface IndexEntry {
  matchId: string;
  home: string; // canonical key
  away: string; // canonical key
  kickoffMs: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Local kick-off strings are ET; +4h reaches UTC (mirrors lib/lock.ts).
function kickoffMs(date: string, time: string): number {
  const [mon, day] = date.split(" ");
  const [h, m] = time.split(":").map(Number);
  return Date.UTC(2026, MONTHS[mon], Number(day), h + 4, m);
}

/**
 * Every fixture we can currently identify, as {matchId, home, away}.
 *  - Group games come straight from MATCHES.
 *  - Knockout games are resolved from the bracket using whatever actual scores
 *    we already have; slots whose teams aren't decided yet are simply omitted
 *    (they'll appear on a later run once the prior round is scored).
 */
export function buildMatchIndex(actualScores: ActualScores): IndexEntry[] {
  const entries: IndexEntry[] = [];

  for (const m of MATCHES) {
    if (!m.group?.startsWith("Group")) continue;
    entries.push({
      matchId: m.id,
      home: canonTeam(m.homeTeam),
      away: canonTeam(m.awayTeam),
      kickoffMs: kickoffMs(m.date, m.time),
    });
  }

  // Merge actual scores into the fixture list so the bracket resolves real teams.
  const merged: Match[] = MATCHES.map((m) => {
    const s = actualScores[m.id];
    return s ? { ...m, homeScore: s.home, awayScore: s.away } : m;
  });

  const { top, bot } = resolveR32Pairs(merged, actualScores, true);
  const bracket = resolveBracketTeams(top, bot, actualScores);

  type SlotPair = { home: { team: string } | null; away: { team: string } | null };
  const koSlots: ReadonlyArray<readonly [string, SlotPair]> = [
    ...TOP_R32_IDS.map((id, i) => [id, top[i]] as const),
    ...BOT_R32_IDS.map((id, i) => [id, bot[i]] as const),
    ...R16_IDS.slice(0, 4).map((id, i) => [id, bracket.r16Top[i]] as const),
    ...R16_IDS.slice(4).map((id, i) => [id, bracket.r16Bot[i]] as const),
    ...QF_IDS.slice(0, 2).map((id, i) => [id, bracket.qfTop[i]] as const),
    ...QF_IDS.slice(2).map((id, i) => [id, bracket.qfBot[i]] as const),
    [SF_IDS[0], bracket.sfTop] as const,
    [SF_IDS[1], bracket.sfBot] as const,
    [THIRD_PLACE_ID, bracket.thirdPlace] as const,
    [FINAL_ID, bracket.final] as const,
  ];

  for (const [id, pair] of koSlots) {
    if (!pair.home?.team || !pair.away?.team) continue;
    const meta = KNOCKOUT_MATCH_META[id];
    entries.push({
      matchId: id,
      home: canonTeam(pair.home.team),
      away: canonTeam(pair.away.team),
      kickoffMs: meta ? kickoffMs(meta.date, meta.time) : 0,
    });
  }

  return entries;
}

// ── Fuzzy fallback ───────────────────────────────────────────────────────────
// Used only when an exact name match fails, so spelling variants the alias map
// doesn't cover ("Bosnia-Herzegovina", "Korea Republic", "Côte d'Ivoire", …)
// still resolve on their own. Safe because we score against real fixture
// pairings and require BOTH teams to be close — a fuzzy guess can't land a score
// on a pairing that was never scheduled.

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  // One name being contained in the other (e.g. "bosniaherz" ⊂
  // "bosniaherzegovina") is a strong signal for these short country keys.
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a))) {
    return 0.92;
  }
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

const FUZZY_PER_TEAM = 0.62; // each team must be at least this close
const FUZZY_PAIR_MIN = 0.78; // and the pair average at least this

interface Match_ { entry: IndexEntry; sameOrientation: boolean; matchedBy: "exact" | "fuzzy"; }

function findEntry(fxHome: string, fxAway: string, fx: ProviderFixture, index: IndexEntry[]): Match_ | null {
  // 1) Exact (after alias normalisation). Nearest kickoff wins on a recurring pair.
  const exact = index.filter(
    (e) => (e.home === fxHome && e.away === fxAway) || (e.home === fxAway && e.away === fxHome),
  );
  if (exact.length > 0) {
    const best = exact.reduce((a, b) =>
      Math.abs(b.kickoffMs - fx.kickoffMs) < Math.abs(a.kickoffMs - fx.kickoffMs) ? b : a,
    );
    return { entry: best, sameOrientation: best.home === fxHome, matchedBy: "exact" };
  }

  // 2) Fuzzy fallback against real fixtures, both orientations.
  let best: { entry: IndexEntry; score: number; sameOrientation: boolean } | null = null;
  for (const e of index) {
    const directH = similarity(fxHome, e.home);
    const directA = similarity(fxAway, e.away);
    const swapH = similarity(fxHome, e.away);
    const swapA = similarity(fxAway, e.home);
    const direct = (directH + directA) / 2;
    const swap = (swapH + swapA) / 2;
    const sameOrientation = direct >= swap;
    const score = sameOrientation ? direct : swap;
    const minTeam = sameOrientation ? Math.min(directH, directA) : Math.min(swapH, swapA);
    if (minTeam < FUZZY_PER_TEAM) continue;
    if (!best || score > best.score) best = { entry: e, score, sameOrientation };
  }
  if (best && best.score >= FUZZY_PAIR_MIN) {
    return { entry: best.entry, sameOrientation: best.sameOrientation, matchedBy: "fuzzy" };
  }
  return null;
}

/**
 * Resolve one provider fixture to our match_id, putting the score into OUR
 * home/away orientation (the provider may list the teams the other way round).
 * Returns null only if neither exact nor fuzzy matching finds a real fixture.
 */
export function mapFixture(fx: ProviderFixture, index: IndexEntry[]): MappedScore | null {
  const fxHome = canonTeam(fx.homeTeam);
  const fxAway = canonTeam(fx.awayTeam);

  const m = findEntry(fxHome, fxAway, fx, index);
  if (!m) return null;

  const { entry, sameOrientation, matchedBy } = m;
  const home = sameOrientation ? fx.homeScore : fx.awayScore;
  const away = sameOrientation ? fx.awayScore : fx.homeScore;

  let pens = fx.pensWinner ?? null;
  if (pens && !sameOrientation) pens = pens === "home" ? "away" : "home";

  return { matchId: entry.matchId, home, away, pens, status: fx.status, matchedBy };
}
