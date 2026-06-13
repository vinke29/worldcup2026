import { MATCHES, type Match, type Member, type Outcome } from "@/lib/mock-data";
import {
  TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID,
  KNOCKOUT_MATCH_META, resolveR32Pairs, resolveBracketTeams, type ScoreEntry,
} from "@/lib/bracket";
import { computeStandings } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// WC 2026 runs in US Eastern summer time (EDT = UTC-4); day boundaries are ET.
function etDateLabel(d: Date): string {
  const et = new Date(d.getTime() - 4 * 3600 * 1000);
  return `${MONTHS[et.getUTCMonth()]} ${et.getUTCDate()}`;
}

export interface RecapGame {
  matchId: string;
  home: string; away: string;
  homeFlag: string; awayFlag: string;
  homeScore: number | null; awayScore: number | null;
  time: string;
}

export interface YesterdayPick {
  home: string; away: string;
  scoreLabel: string;     // "2–0"
  pickLabel: string;      // "2–1" or "South Korea" or "Draw"
  correct: boolean;
  exact: boolean;
  played: boolean;        // did the member have a pick at all
}

export interface MemberRecap {
  id: string;
  name: string;
  pointsNow: number;
  pointsGained: number;
  rankNow: number;
  rankBefore: number | null;
  gapToFirst: number;
  yesterday: YesterdayPick[];
  hadAnyPick: boolean;
}

export interface StandingRow {
  rank: number;
  id: string;
  name: string;
  points: number;
  movement: number; // rankBefore - rankNow; >0 climbed, <0 dropped, 0 same/new
}

export interface WorstPick { name: string; game: string; pick: string; actual: string; badness: number; }
export interface BestCall { name: string; game: string; called: string; actual: string; rarity: number; exact: boolean; score: number; }

export interface RecapData {
  leagueName: string;
  recapLabel: string;
  todayLabel: string;
  results: RecapGame[];
  upcoming: RecapGame[];
  standings: StandingRow[];
  members: MemberRecap[];
  worstPicks: WorstPick[];
  bestCalls: BestCall[];
  leaderName: string | null;
  hasContent: boolean;
}

function fmtTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function outcomeOf(h: number, a: number): Outcome {
  return h > a ? "home" : a > h ? "away" : "draw";
}

function buildFixtureLookup(actualScores: Record<string, ScoreEntry>) {
  const map = new Map<string, { home: string; away: string; homeFlag: string; awayFlag: string; date: string; time: string }>();
  for (const m of MATCHES) {
    map.set(m.id, { home: m.homeTeam, away: m.awayTeam, homeFlag: m.homeFlag, awayFlag: m.awayFlag, date: m.date, time: m.time });
  }
  const merged: Match[] = MATCHES.map((m) => {
    const s = actualScores[m.id];
    return s ? { ...m, homeScore: s.home, awayScore: s.away } : m;
  });
  const { top, bot } = resolveR32Pairs(merged, actualScores, true);
  const bracket = resolveBracketTeams(top, bot, actualScores);
  const koSlots: Array<readonly [string, { home: { team: string; flag: string } | null; away: { team: string; flag: string } | null }]> = [
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
    const meta = KNOCKOUT_MATCH_META[id];
    if (!meta) continue;
    map.set(id, {
      home: pair.home?.team ?? "TBD", away: pair.away?.team ?? "TBD",
      homeFlag: pair.home?.flag ?? "", awayFlag: pair.away?.flag ?? "",
      date: meta.date, time: meta.time,
    });
  }
  return map;
}

async function loadMembers(supabase: ReturnType<typeof createAdminClient>, leagueId: string): Promise<Member[]> {
  const { data: memberRows } = await supabase.from("league_members").select("user_id").eq("league_id", leagueId);
  const ids = (memberRows ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const [{ data: profiles }, { data: preds }, { data: picks }] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar").in("id", ids),
    supabase.from("predictions").select("user_id, match_id, outcome").in("user_id", ids),
    supabase.from("score_picks").select("user_id, match_id, home_score, away_score, pens_winner").in("user_id", ids),
  ]);
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return ids.map((id) => {
    const predictions: Record<string, Outcome> = {};
    const scorePicks: Record<string, ScoreEntry> = {};
    for (const p of preds ?? []) if (p.user_id === id) predictions[p.match_id] = p.outcome as Outcome;
    for (const sp of picks ?? []) if (sp.user_id === id) {
      scorePicks[sp.match_id] = { home: sp.home_score, away: sp.away_score, ...(sp.pens_winner ? { pens: sp.pens_winner as "home" | "away" } : {}) };
    }
    const prof = pmap.get(id);
    return {
      id, name: prof?.name ?? "Unknown", avatar: prof?.avatar ?? "?",
      points: 0, correct: 0, exact: 0, total: 0, picked: 0, groupPts: 0, koPts: 0, bonusPts: 0,
      predictions, scorePicks,
    };
  });
}

function rankMap(members: Member[], matches: Match[], scores: Record<string, ScoreEntry>) {
  const ranked = computeStandings(matches, members, "__none__", {}, {}, scores).sort((a, b) => b.points - a.points);
  const points = new Map(ranked.map((m) => [m.id, m.points]));
  const rank = new Map(ranked.map((m, i) => [m.id, i + 1]));
  return { ranked, points, rank };
}

/**
 * Assemble the personalized recap for one league as of `asOf` (defaults to now).
 * Recaps the previous ET day, previews the current day. Movement and points-gained
 * come from recomputing standings with yesterday's results removed, so no history
 * table is needed. Standings use group + knockout points.
 */
export async function getRecapData(leagueCode: string, asOf: Date = new Date()): Promise<RecapData | null> {
  const supabase = createAdminClient();
  const { data: league } = await supabase.from("leagues").select("id, name").eq("code", leagueCode).maybeSingle();
  if (!league) return null;

  const recapLabel = etDateLabel(new Date(asOf.getTime() - 24 * 3600 * 1000));
  const todayLabel = etDateLabel(asOf);

  const { data: scoreRows } = await supabase.from("match_scores").select("match_id, home_score, away_score, pens_winner");
  const actualScores: Record<string, ScoreEntry> = {};
  for (const r of scoreRows ?? []) {
    actualScores[r.match_id] = { home: r.home_score, away: r.away_score, ...(r.pens_winner ? { pens: r.pens_winner as "home" | "away" } : {}) };
  }

  const fixtures = buildFixtureLookup(actualScores);
  const members = await loadMembers(supabase, league.id);

  // Yesterday's results.
  const results: RecapGame[] = [];
  for (const [matchId, s] of Object.entries(actualScores)) {
    const f = fixtures.get(matchId);
    if (!f || f.date !== recapLabel) continue;
    results.push({ matchId, home: f.home, away: f.away, homeFlag: f.homeFlag, awayFlag: f.awayFlag, homeScore: s.home, awayScore: s.away, time: fmtTime(f.time) });
  }
  results.sort((a, b) => a.time.localeCompare(b.time));

  // Today's *upcoming* games only (no result yet) — finished ones live in results.
  const upcoming: RecapGame[] = [];
  for (const [matchId, f] of fixtures.entries()) {
    if (f.date !== todayLabel || actualScores[matchId]) continue;
    upcoming.push({ matchId, home: f.home, away: f.away, homeFlag: f.homeFlag, awayFlag: f.awayFlag, homeScore: null, awayScore: null, time: fmtTime(f.time) });
  }
  upcoming.sort((a, b) => a.time.localeCompare(b.time));

  // Standings now vs "before yesterday" (yesterday's results removed) → movement & gained.
  const yesterdayIds = new Set(results.map((r) => r.matchId));
  const scoresBefore: Record<string, ScoreEntry> = {};
  for (const [id, s] of Object.entries(actualScores)) if (!yesterdayIds.has(id)) scoresBefore[id] = s;

  const mergedNow: Match[] = MATCHES.map((m) => (actualScores[m.id] ? { ...m, homeScore: actualScores[m.id].home, awayScore: actualScores[m.id].away } : m));
  const mergedBefore: Match[] = MATCHES.map((m) => (scoresBefore[m.id] ? { ...m, homeScore: scoresBefore[m.id].home, awayScore: scoresBefore[m.id].away } : m));

  const now = rankMap(members, mergedNow, actualScores);
  const before = rankMap(members, mergedBefore, scoresBefore);
  const leaderName = now.ranked.length ? now.ranked[0].name : null;
  const leaderPts = now.ranked.length ? now.ranked[0].points : 0;

  const standings: StandingRow[] = now.ranked.map((m, i) => {
    const rb = before.rank.get(m.id) ?? null;
    return { rank: i + 1, id: m.id, name: m.name, points: m.points, movement: rb ? rb - (i + 1) : 0 };
  });

  // Per-member detail.
  const memberRecaps: MemberRecap[] = now.ranked.map((m, i) => {
    const yesterday: YesterdayPick[] = results.map((g) => {
      const sp = m.scorePicks?.[g.matchId];
      const pr = m.predictions[g.matchId];
      const actual = outcomeOf(g.homeScore!, g.awayScore!);
      let pickLabel = ""; let correct = false; let exact = false; const played = !!(sp || pr);
      if (sp) {
        pickLabel = `${sp.home}–${sp.away}`;
        correct = outcomeOf(sp.home, sp.away) === actual;
        exact = sp.home === g.homeScore && sp.away === g.awayScore;
      } else if (pr) {
        pickLabel = pr === "home" ? g.home : pr === "away" ? g.away : "Draw";
        correct = pr === actual;
      }
      return { home: g.home, away: g.away, scoreLabel: `${g.homeScore}–${g.awayScore}`, pickLabel, correct, exact, played };
    });
    return {
      id: m.id, name: m.name,
      pointsNow: m.points,
      pointsGained: m.points - (before.points.get(m.id) ?? 0),
      rankNow: i + 1,
      rankBefore: before.rank.get(m.id) ?? null,
      gapToFirst: leaderPts - m.points,
      yesterday,
      hadAnyPick: yesterday.some((y) => y.played),
    };
  });

  // Worst picks (Goat) + best calls (Called-it) among yesterday's games.
  const total = members.length || 1;
  const worst: WorstPick[] = [];
  const best: BestCall[] = [];
  for (const g of results) {
    if (g.homeScore == null || g.awayScore == null) continue;
    const actual = outcomeOf(g.homeScore, g.awayScore);
    const gameLabel = `${g.home} vs ${g.away}`;
    const actualLabel = `ended ${g.homeScore}–${g.awayScore}`;
    let correctCount = 0;
    for (const m of members) {
      const sp = m.scorePicks?.[g.matchId];
      const pr = m.predictions[g.matchId];
      const out = sp ? outcomeOf(sp.home, sp.away) : pr;
      if (out && out === actual) correctCount++;
    }
    const rarity = correctCount / total;
    for (const m of members) {
      const sp = m.scorePicks?.[g.matchId];
      const pr = m.predictions[g.matchId];
      if (sp) {
        const out = outcomeOf(sp.home, sp.away);
        const err = Math.abs(sp.home - g.homeScore) + Math.abs(sp.away - g.awayScore);
        const badness = err + (out !== actual ? 5 : 0);
        if (badness > 0) worst.push({ name: m.name, game: gameLabel, pick: `predicted ${sp.home}–${sp.away}`, actual: actualLabel, badness });
        if (out === actual) {
          const exact = sp.home === g.homeScore && sp.away === g.awayScore;
          best.push({ name: m.name, game: gameLabel, called: exact ? `nailed ${g.homeScore}–${g.awayScore}` : `called ${g.home} ${g.homeScore}–${g.awayScore} ${g.away}`, actual: actualLabel, rarity, exact, score: (1 - rarity) + (exact ? 1 : 0) });
        }
      } else if (pr) {
        if (pr !== actual) {
          const side = pr === "home" ? g.home : pr === "away" ? g.away : "a draw";
          worst.push({ name: m.name, game: gameLabel, pick: `picked ${side}`, actual: actualLabel, badness: 4 });
        } else {
          best.push({ name: m.name, game: gameLabel, called: `called ${pr === "home" ? g.home : pr === "away" ? g.away : "the draw"}`, actual: actualLabel, rarity, exact: false, score: 1 - rarity });
        }
      }
    }
  }
  worst.sort((a, b) => b.badness - a.badness);
  best.sort((a, b) => b.score - a.score);

  return {
    leagueName: league.name,
    recapLabel, todayLabel,
    results, upcoming, standings,
    members: memberRecaps,
    worstPicks: worst.slice(0, 3),
    bestCalls: best.slice(0, 3),
    leaderName,
    hasContent: results.length > 0 || upcoming.length > 0,
  };
}
