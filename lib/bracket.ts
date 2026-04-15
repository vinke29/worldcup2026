import type { Match } from "./mock-data";
import type { TeamRow } from "./group-standings";
import { computeGroupTables, rankThirdPlaceTeams } from "./group-standings";

// ── Knockout match IDs ────────────────────────────────────────────────────────
// These are used consistently in: admin score entry, QualifiersView, phase unlocking.

/** R32 match IDs — in TOP_R32 then BOTTOM_R32 order (as in QualifiersView) */
export const TOP_R32_IDS  = ["m74","m77","m73","m75","m83","m84","m81","m82"];
export const BOT_R32_IDS  = ["m76","m78","m79","m80","m86","m88","m85","m87"];
export const R32_IDS      = [...TOP_R32_IDS, ...BOT_R32_IDS];

/** R16: 0–3 = top half, 4–7 = bottom half */
export const R16_IDS = [
  "r16-0","r16-1","r16-2","r16-3",   // top half
  "r16-4","r16-5","r16-6","r16-7",   // bottom half
];

export const QF_IDS   = ["qf-0","qf-1","qf-2","qf-3"];   // 0–1 top, 2–3 bottom
export const SF_IDS          = ["sf-0","sf-1"];           // 0 top, 1 bottom
export const THIRD_PLACE_ID  = "third-0";
export const FINAL_ID        = "final-0";

export const ALL_KNOCKOUT_IDS = [...R32_IDS, ...R16_IDS, ...QF_IDS, ...SF_IDS, THIRD_PLACE_ID, FINAL_ID];

// ── Match metadata (date / time / venue) ──────────────────────────────────────
export interface KnockoutMatchMeta { date: string; time: string; venue: string }

export const KNOCKOUT_MATCH_META: Record<string, KnockoutMatchMeta> = {
  // R32 — Jun 28 – Jul 3
  "m73": { date: "Jun 28", time: "15:00", venue: "SoFi Stadium · Inglewood" },
  "m74": { date: "Jun 29", time: "16:30", venue: "Gillette Stadium · Foxborough" },
  "m75": { date: "Jun 29", time: "21:00", venue: "Estadio BBVA · Guadalupe" },
  "m76": { date: "Jun 29", time: "13:00", venue: "NRG Stadium · Houston" },
  "m77": { date: "Jun 30", time: "17:00", venue: "MetLife Stadium · East Rutherford" },
  "m78": { date: "Jun 30", time: "13:00", venue: "AT&T Stadium · Arlington" },
  "m79": { date: "Jun 30", time: "21:00", venue: "Estadio Azteca · Mexico City" },
  "m80": { date: "Jul 1",  time: "12:00", venue: "Mercedes-Benz Stadium · Atlanta" },
  "m81": { date: "Jul 1",  time: "20:00", venue: "Levi's Stadium · Santa Clara" },
  "m82": { date: "Jul 1",  time: "16:00", venue: "Lumen Field · Seattle" },
  "m83": { date: "Jul 2",  time: "19:00", venue: "BMO Field · Toronto" },
  "m84": { date: "Jul 2",  time: "15:00", venue: "SoFi Stadium · Inglewood" },
  "m85": { date: "Jul 2",  time: "23:00", venue: "BC Place · Vancouver" },
  "m86": { date: "Jul 3",  time: "18:00", venue: "Hard Rock Stadium · Miami" },
  "m87": { date: "Jul 3",  time: "21:30", venue: "Arrowhead Stadium · Kansas City" },
  "m88": { date: "Jul 3",  time: "14:00", venue: "AT&T Stadium · Arlington" },
  // R16 — Jul 4–7 (slot order follows bracket pairing, not calendar order)
  "r16-0": { date: "Jul 4",  time: "17:00", venue: "Lincoln Financial Field · Philadelphia" },
  "r16-1": { date: "Jul 4",  time: "13:00", venue: "NRG Stadium · Houston" },
  "r16-2": { date: "Jul 6",  time: "15:00", venue: "AT&T Stadium · Arlington" },
  "r16-3": { date: "Jul 6",  time: "20:00", venue: "Lumen Field · Seattle" },
  "r16-4": { date: "Jul 5",  time: "16:00", venue: "MetLife Stadium · East Rutherford" },
  "r16-5": { date: "Jul 5",  time: "20:00", venue: "Estadio Azteca · Mexico City" },
  "r16-6": { date: "Jul 7",  time: "12:00", venue: "Mercedes-Benz Stadium · Atlanta" },
  "r16-7": { date: "Jul 7",  time: "16:00", venue: "BC Place · Vancouver" },
  // QF — Jul 9–11
  "qf-0":  { date: "Jul 9",  time: "16:00", venue: "Gillette Stadium · Foxborough" },
  "qf-1":  { date: "Jul 10", time: "15:00", venue: "SoFi Stadium · Inglewood" },
  "qf-2":  { date: "Jul 11", time: "17:00", venue: "Hard Rock Stadium · Miami" },
  "qf-3":  { date: "Jul 11", time: "21:00", venue: "Arrowhead Stadium · Kansas City" },
  // SF — Jul 14–15
  "sf-0":    { date: "Jul 14", time: "15:00", venue: "AT&T Stadium · Arlington" },
  "sf-1":    { date: "Jul 15", time: "15:00", venue: "Mercedes-Benz Stadium · Atlanta" },
  // 3rd Place — Jul 18
  "third-0": { date: "Jul 18", time: "17:00", venue: "Hard Rock Stadium · Miami" },
  // Final — Jul 19
  "final-0": { date: "Jul 19", time: "15:00", venue: "MetLife Stadium · East Rutherford" },
};

/** Official FIFA match numbers for every knockout fixture */
export const KNOCKOUT_MATCH_NUMBER: Record<string, number> = {
  // R32 (73–88)
  m73:73, m74:74, m75:75, m76:76, m77:77, m78:78,
  m79:79, m80:80, m81:81, m82:82, m83:83, m84:84,
  m85:85, m86:86, m87:87, m88:88,
  // R16 (89–96) — slot order follows bracket pairing (not calendar date order)
  "r16-0":89, "r16-1":90, "r16-2":93, "r16-3":94,
  "r16-4":91, "r16-5":92, "r16-6":95, "r16-7":96,
  // QF (97–100)
  "qf-0":97, "qf-1":98, "qf-2":99, "qf-3":100,
  // SF (101–102)
  "sf-0":101, "sf-1":102,
  // 3rd place & Final
  "third-0":103, "final-0":104,
};

// ── Match labels for admin display ────────────────────────────────────────────
export interface KnockoutMatchInfo {
  id: string;
  homeLabel: string;
  awayLabel: string;
}

/** Static R32 slot labels — mirrors QualifiersView's slotLabel() output */
export const R32_LABELS: KnockoutMatchInfo[] = [
  // top half
  { id: "m74", homeLabel: "1E",  awayLabel: "3rd ABCDF" },
  { id: "m77", homeLabel: "1I",  awayLabel: "3rd CDFGH" },
  { id: "m73", homeLabel: "2A",  awayLabel: "2B" },
  { id: "m75", homeLabel: "1F",  awayLabel: "2C" },
  { id: "m83", homeLabel: "2K",  awayLabel: "2L" },
  { id: "m84", homeLabel: "1H",  awayLabel: "2J" },
  { id: "m81", homeLabel: "1D",  awayLabel: "3rd BEFIJ" },
  { id: "m82", homeLabel: "1G",  awayLabel: "3rd AEHIJ" },
  // bottom half
  { id: "m76", homeLabel: "1C",  awayLabel: "2F" },
  { id: "m78", homeLabel: "2E",  awayLabel: "2I" },
  { id: "m79", homeLabel: "1A",  awayLabel: "3rd CEFHI" },
  { id: "m80", homeLabel: "1L",  awayLabel: "3rd EHIJK" },
  { id: "m86", homeLabel: "1J",  awayLabel: "2H" },
  { id: "m88", homeLabel: "2D",  awayLabel: "2G" },
  { id: "m85", homeLabel: "1B",  awayLabel: "3rd EFGIJ" },
  { id: "m87", homeLabel: "1K",  awayLabel: "3rd DEIJL" },
];

// ── R32 slot definitions ──────────────────────────────────────────────────────
// Defines which group position occupies each side of every R32 match.
// Shared between QualifiersView (display) and scoring (team-based KO points).

export type WinnerSlot   = { kind: "winner"; group: string };
export type RunnerUpSlot = { kind: "runner"; group: string };
export type ThirdSlot    = { kind: "third";  eligible: string[] };
export type BracketSlot  = WinnerSlot | RunnerUpSlot | ThirdSlot;
export interface R32MatchDef { id: string; home: BracketSlot; away: BracketSlot }

export const TOP_R32_DEFS: R32MatchDef[] = [
  { id: "m74", home: { kind: "winner", group: "E" }, away: { kind: "third",  eligible: ["A","B","C","D","F"] } },
  { id: "m77", home: { kind: "winner", group: "I" }, away: { kind: "third",  eligible: ["C","D","F","G","H"] } },
  { id: "m73", home: { kind: "runner", group: "A" }, away: { kind: "runner", group: "B" } },
  { id: "m75", home: { kind: "winner", group: "F" }, away: { kind: "runner", group: "C" } },
  { id: "m83", home: { kind: "runner", group: "K" }, away: { kind: "runner", group: "L" } },
  { id: "m84", home: { kind: "winner", group: "H" }, away: { kind: "runner", group: "J" } },
  { id: "m81", home: { kind: "winner", group: "D" }, away: { kind: "third",  eligible: ["B","E","F","I","J"] } },
  { id: "m82", home: { kind: "winner", group: "G" }, away: { kind: "third",  eligible: ["A","E","H","I","J"] } },
];

export const BOT_R32_DEFS: R32MatchDef[] = [
  { id: "m76", home: { kind: "winner", group: "C" }, away: { kind: "runner", group: "F" } },
  { id: "m78", home: { kind: "runner", group: "E" }, away: { kind: "runner", group: "I" } },
  { id: "m79", home: { kind: "winner", group: "A" }, away: { kind: "third",  eligible: ["C","E","F","H","I"] } },
  { id: "m80", home: { kind: "winner", group: "L" }, away: { kind: "third",  eligible: ["E","H","I","J","K"] } },
  { id: "m86", home: { kind: "winner", group: "J" }, away: { kind: "runner", group: "H" } },
  { id: "m88", home: { kind: "runner", group: "D" }, away: { kind: "runner", group: "G" } },
  { id: "m85", home: { kind: "winner", group: "B" }, away: { kind: "third",  eligible: ["E","F","G","I","J"] } },
  { id: "m87", home: { kind: "winner", group: "K" }, away: { kind: "third",  eligible: ["D","E","I","J","L"] } },
];

export const THIRD_SLOT_ASSIGNMENTS: Array<{ matchId: string; eligible: string[] }> = [
  { matchId: "m74", eligible: ["A","B","C","D","F"] },
  { matchId: "m77", eligible: ["C","D","F","G","H"] },
  { matchId: "m79", eligible: ["C","E","F","H","I"] },
  { matchId: "m80", eligible: ["E","H","I","J","K"] },
  { matchId: "m81", eligible: ["B","E","F","I","J"] },
  { matchId: "m82", eligible: ["A","E","H","I","J"] },
  { matchId: "m85", eligible: ["E","F","G","I","J"] },
  { matchId: "m87", eligible: ["D","E","I","J","L"] },
];

export function assignThirdPlaceGroups(qualifyingGroups: string[]): Record<string, string> {
  const assignment: Record<string, string> = {};
  const used = new Set<string>();
  function bt(idx: number): boolean {
    if (idx === THIRD_SLOT_ASSIGNMENTS.length) return true;
    const slot = THIRD_SLOT_ASSIGNMENTS[idx];
    for (const g of qualifyingGroups) {
      if (used.has(g) || !slot.eligible.includes(g)) continue;
      assignment[slot.matchId] = g;
      used.add(g);
      if (bt(idx + 1)) return true;
      delete assignment[slot.matchId];
      used.delete(g);
    }
    return false;
  }
  bt(0);
  return assignment;
}

/** Resolve a single bracket slot to the actual team, given group tables. */
export function resolveSlotTeam(
  slot: BracketSlot,
  tables: Record<string, TeamRow[]>,
  matchId: string,
  thirdAssign: Record<string, string>,
  byGroup: Record<string, TeamRow>,
): TeamRow | null {
  if (slot.kind === "winner") return tables[`Group ${slot.group}`]?.[0] ?? null;
  if (slot.kind === "runner") return tables[`Group ${slot.group}`]?.[1] ?? null;
  const g = thirdAssign[matchId];
  return g ? (byGroup[g] ?? null) : null;
}

/**
 * Resolve all R32 team pairs from group stage data.
 * Pass useActual=true to use actual match scores; false to use scorePicks.
 */
export function resolveR32Pairs(
  matches: Match[],
  scorePicks: Record<string, ScoreEntry>,
  useActual: boolean,
): { top: Pair[]; bot: Pair[] } {
  const tables = computeGroupTables(matches, scorePicks, useActual);
  const ranked3rd = rankThirdPlaceTeams(tables);
  const top8 = ranked3rd.slice(0, 8);
  const byGroup: Record<string, TeamRow> = {};
  for (const { group, row } of ranked3rd) byGroup[group] = row;
  const thirdAssign = assignThirdPlaceGroups(top8.map(t => t.group));

  const top = TOP_R32_DEFS.map(m => ({
    home: resolveSlotTeam(m.home, tables, m.id, thirdAssign, byGroup),
    away: resolveSlotTeam(m.away, tables, m.id, thirdAssign, byGroup),
  }));
  const bot = BOT_R32_DEFS.map(m => ({
    home: resolveSlotTeam(m.home, tables, m.id, thirdAssign, byGroup),
    away: resolveSlotTeam(m.away, tables, m.id, thirdAssign, byGroup),
  }));
  return { top, bot };
}

// ── Bracket team resolution ───────────────────────────────────────────────────

type Pair = { home: TeamRow | null; away: TeamRow | null };
export type ScoreEntry = { home: number; away: number; pens?: "home" | "away" };
type Scores = Record<string, ScoreEntry>;

function matchLoser(pair: Pair, score: ScoreEntry | undefined): TeamRow | null {
  if (!pair.home || !pair.away || !score) return null;
  if (score.home > score.away) return pair.away;
  if (score.away > score.home) return pair.home;
  if (score.pens === "home") return pair.away;
  if (score.pens === "away") return pair.home;
  return null;
}

function matchWinner(pair: Pair, score: ScoreEntry | undefined): TeamRow | null {
  if (!pair.home || !pair.away || !score) return null;
  if (score.home > score.away) return pair.home;
  if (score.away > score.home) return pair.away;
  if (score.pens === "home") return pair.home;
  if (score.pens === "away") return pair.away;
  return null; // still tied — no winner resolved yet
}

export interface BracketTeams {
  r16Top:      Pair[];   // 4 matches
  r16Bot:      Pair[];   // 4 matches
  qfTop:       Pair[];   // 2 matches
  qfBot:       Pair[];   // 2 matches
  sfTop:       Pair;
  sfBot:       Pair;
  thirdPlace:  Pair;     // losers of both SFs
  final:       Pair;
}

/**
 * Given resolved R32 team pairs (home/away for each of 8+8 R32 matches)
 * and actual knockout scores, propagate winners through the bracket tree.
 */
export function resolveBracketTeams(
  topR32: Pair[],   // 8 pairs, in TOP_R32_IDS order
  botR32: Pair[],   // 8 pairs, in BOT_R32_IDS order
  actualScores: Scores,
): BracketTeams {
  // R32 winners
  const topW = TOP_R32_IDS.map((id, i) => matchWinner(topR32[i], actualScores[id]));
  const botW = BOT_R32_IDS.map((id, i) => matchWinner(botR32[i], actualScores[id]));

  // R16: pairs 0&1, 2&3, 4&5, 6&7
  const r16Top: Pair[] = [0,2,4,6].map(i => ({ home: topW[i], away: topW[i+1] }));
  const r16Bot: Pair[] = [0,2,4,6].map(i => ({ home: botW[i], away: botW[i+1] }));

  const r16TopW = r16Top.map((p, i) => matchWinner(p, actualScores[R16_IDS[i]]));
  const r16BotW = r16Bot.map((p, i) => matchWinner(p, actualScores[R16_IDS[4+i]]));

  // QF
  const qfTop: Pair[] = [0,2].map(i => ({ home: r16TopW[i], away: r16TopW[i+1] }));
  const qfBot: Pair[] = [0,2].map(i => ({ home: r16BotW[i], away: r16BotW[i+1] }));

  const qfTopW = qfTop.map((p, i) => matchWinner(p, actualScores[QF_IDS[i]]));
  const qfBotW = qfBot.map((p, i) => matchWinner(p, actualScores[QF_IDS[2+i]]));

  // SF
  const sfTop: Pair = { home: qfTopW[0], away: qfTopW[1] };
  const sfBot: Pair = { home: qfBotW[0], away: qfBotW[1] };

  const sfTopW = matchWinner(sfTop, actualScores[SF_IDS[0]]);
  const sfBotW = matchWinner(sfBot, actualScores[SF_IDS[1]]);
  const sfTopL = matchLoser(sfTop, actualScores[SF_IDS[0]]);
  const sfBotL = matchLoser(sfBot, actualScores[SF_IDS[1]]);

  return {
    r16Top, r16Bot,
    qfTop, qfBot,
    sfTop, sfBot,
    thirdPlace: { home: sfTopL, away: sfBotL },
    final: { home: sfTopW, away: sfBotW },
  };
}

// ── Phase status computation ──────────────────────────────────────────────────

import type { PhaseId } from "./mock-data";

function allHaveScores(ids: string[], actualScores: Scores): boolean {
  return ids.every(id => actualScores[id] != null);
}

/**
 * Returns a status override for each phase based on which rounds have complete scores.
 * Group phases are always open (predictions allowed from the start).
 * Knockout phases unlock once the previous round is fully scored.
 */
export function computePhaseStatuses(
  groupMatches: Match[],
  actualScores: Scores,
): Partial<Record<PhaseId, "open" | "locked" | "completed">> {
  const groupMd1Ids = groupMatches.filter(m => m.phase === "group-md1").map(m => m.id);
  const groupMd2Ids = groupMatches.filter(m => m.phase === "group-md2").map(m => m.id);
  const groupMd3Ids = groupMatches.filter(m => m.phase === "group-md3").map(m => m.id);

  const md1Done = allHaveScores(groupMd1Ids, actualScores);
  const md2Done = allHaveScores(groupMd2Ids, actualScores);
  const md3Done = allHaveScores(groupMd3Ids, actualScores);
  const groupDone = md1Done && md2Done && md3Done;
  const r32Done  = allHaveScores(R32_IDS, actualScores);
  const r16Done  = allHaveScores(R16_IDS, actualScores);
  const qfDone   = allHaveScores(QF_IDS,  actualScores);
  const sfDone   = allHaveScores(SF_IDS,  actualScores);

  return {
    "group-md1": md1Done  ? "completed" : "open",
    "group-md2": md2Done  ? "completed" : "open",
    "group-md3": md3Done  ? "completed" : "open",
    "r32":  groupDone ? (r32Done ? "completed" : "open") : "locked",
    "r16":  r32Done   ? (r16Done ? "completed" : "open") : "locked",
    "qf":   r16Done   ? (qfDone  ? "completed" : "open") : "locked",
    "sf":    qfDone ? (sfDone ? "completed" : "open") : "locked",
    "third": sfDone ? "open"                          : "locked",
    "final": sfDone ? "open"                          : "locked",
  };
}
