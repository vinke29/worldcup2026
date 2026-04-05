import type { Match } from "./mock-data";

export interface TeamRow {
  team: string;
  flag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

interface PlayedMatch {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

function ensureTeam(rows: Record<string, TeamRow>, team: string, flag: string) {
  if (!rows[team]) {
    rows[team] = { team, flag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }
}

function applyResult(
  rows: Record<string, TeamRow>,
  homeTeam: string, homeFlag: string, homeGoals: number,
  awayTeam: string, awayFlag: string, awayGoals: number,
): PlayedMatch {
  ensureTeam(rows, homeTeam, homeFlag);
  ensureTeam(rows, awayTeam, awayFlag);

  const h = rows[homeTeam];
  const a = rows[awayTeam];

  h.mp++; a.mp++;
  h.gf += homeGoals; h.ga += awayGoals;
  a.gf += awayGoals; a.ga += homeGoals;
  h.gd = h.gf - h.ga;
  a.gd = a.gf - a.ga;

  if (homeGoals > awayGoals) {
    h.w++; h.pts += 3; a.l++;
  } else if (homeGoals === awayGoals) {
    h.d++; h.pts++; a.d++; a.pts++;
  } else {
    h.l++; a.w++; a.pts += 3;
  }

  return { homeTeam, awayTeam, homeGoals, awayGoals };
}

/** Head-to-head stats for exactly two teams from the played matches in their group */
function h2hStats(
  teamA: string,
  teamB: string,
  played: PlayedMatch[],
): { a: { pts: number; gd: number; gf: number }; b: { pts: number; gd: number; gf: number } } {
  const a = { pts: 0, gd: 0, gf: 0 };
  const b = { pts: 0, gd: 0, gf: 0 };

  for (const m of played) {
    if (m.homeTeam === teamA && m.awayTeam === teamB) {
      a.gf += m.homeGoals; a.gd += m.homeGoals - m.awayGoals;
      b.gf += m.awayGoals; b.gd += m.awayGoals - m.homeGoals;
      if (m.homeGoals > m.awayGoals)      { a.pts += 3; }
      else if (m.homeGoals === m.awayGoals) { a.pts += 1; b.pts += 1; }
      else                                  { b.pts += 3; }
    } else if (m.homeTeam === teamB && m.awayTeam === teamA) {
      b.gf += m.homeGoals; b.gd += m.homeGoals - m.awayGoals;
      a.gf += m.awayGoals; a.gd += m.awayGoals - m.homeGoals;
      if (m.homeGoals > m.awayGoals)      { b.pts += 3; }
      else if (m.homeGoals === m.awayGoals) { a.pts += 1; b.pts += 1; }
      else                                  { a.pts += 3; }
    }
  }
  return { a, b };
}

/**
 * FIFA WC2026 tiebreaker order (new for 2026 — H2H before overall GD):
 * 1. Overall pts
 * 2. H2H pts (between tied teams)
 * 3. H2H GD
 * 4. H2H GF
 * 5. Overall GD
 * 6. Overall GF
 */
function sortTable(rows: TeamRow[], played: PlayedMatch[]): TeamRow[] {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;

    const { a: ha, b: hb } = h2hStats(a.team, b.team, played);
    if (hb.pts !== ha.pts) return hb.pts - ha.pts;
    if (hb.gd  !== ha.gd)  return hb.gd  - ha.gd;
    if (hb.gf  !== ha.gf)  return hb.gf  - ha.gf;

    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

export function computeGroupTables(
  matches: Match[],
  scorePicks: Record<string, { home: number; away: number }>,
  useActual = false,
): Record<string, TeamRow[]> {
  const groupRows:   Record<string, Record<string, TeamRow>> = {};
  const groupPlayed: Record<string, PlayedMatch[]>           = {};

  for (const match of matches) {
    if (!match.group || !match.group.startsWith("Group")) continue;
    if (!groupRows[match.group]) {
      groupRows[match.group]   = {};
      groupPlayed[match.group] = [];
    }

    const rows = groupRows[match.group];

    if (useActual) {
      if (match.homeScore !== null && match.awayScore !== null) {
        groupPlayed[match.group].push(
          applyResult(rows, match.homeTeam, match.homeFlag, match.homeScore,
                            match.awayTeam, match.awayFlag, match.awayScore),
        );
      } else {
        ensureTeam(rows, match.homeTeam, match.homeFlag);
        ensureTeam(rows, match.awayTeam, match.awayFlag);
      }
    } else {
      const pick = scorePicks[match.id];
      if (pick) {
        groupPlayed[match.group].push(
          applyResult(rows, match.homeTeam, match.homeFlag, pick.home,
                            match.awayTeam, match.awayFlag, pick.away),
        );
      } else {
        ensureTeam(rows, match.homeTeam, match.homeFlag);
        ensureTeam(rows, match.awayTeam, match.awayFlag);
      }
    }
  }

  const result: Record<string, TeamRow[]> = {};
  for (const group of Object.keys(groupRows).sort()) {
    result[group] = sortTable(Object.values(groupRows[group]), groupPlayed[group]);
  }
  return result;
}

/**
 * Rank all 12 third-place finishers for the "best 8 advance" calculation.
 * Criteria (cross-group): Pts → GD → GF.
 * Returns all 12 sorted, best first.
 */
export function rankThirdPlaceTeams(
  tables: Record<string, TeamRow[]>,
): Array<{ group: string; row: TeamRow }> {
  const thirds: Array<{ group: string; row: TeamRow }> = [];
  for (const [key, rows] of Object.entries(tables)) {
    const letter = key.replace("Group ", "");
    if (rows.length >= 3) thirds.push({ group: letter, row: rows[2] });
  }
  return thirds.sort((a, b) => {
    if (b.row.pts !== a.row.pts) return b.row.pts - a.row.pts;
    if (b.row.gd  !== a.row.gd)  return b.row.gd  - a.row.gd;
    return b.row.gf - a.row.gf;
  });
}

/** How many teams land in the same position in both tables (0–4 per group) */
export function countCorrectPositions(predicted: TeamRow[], actual: TeamRow[]): number {
  return predicted.reduce((acc, row, i) => {
    return acc + (actual[i]?.team === row.team ? 1 : 0);
  }, 0);
}

/** True if any match in the dataset has actual scores filled in */
export function hasAnyActualResults(matches: Match[]): boolean {
  return matches.some(m => m.homeScore !== null && m.awayScore !== null);
}
